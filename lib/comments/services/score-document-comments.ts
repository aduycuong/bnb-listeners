import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { comments, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";

import { COMMENT_STANCE_BATCH_SIZE, DISCUSSION_DOC_TYPE } from "../config";
import { scoreDocumentCommentsPayloadSchema } from "../schema";
import type { ScoreDocumentCommentsResult } from "../types";
import { syncDiscussionDocument } from "./sync-discussion-document";
import { isNoiseComment } from "../utils/is-noise-comment";
import { recountCommentSignals } from "../utils/recount-comment-signals";
import { scoreCommentsWithLlm } from "../utils/score-comments-with-llm";

/**
 * QStash handler: score every unscored comment on a parent document.
 *
 * 1. Cheap noise filter marks obvious junk as role=other without an LLM call.
 * 2. Remaining comments are scored in batches for role + stance + substance.
 * 3. Role/stance tallies are written onto the parent document.
 * 4. Substantive comments are rolled into a companion discussion document
 *    (which then goes through process-document for classify + chunk).
 */
export async function scoreDocumentComments(
  payload: unknown,
): Promise<ScoreDocumentCommentsResult> {
  const parsed = scoreDocumentCommentsPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[score-document-comments] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  const { documentId } = parsed.data;

  const [parent] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!parent) throw new NotFoundError("document", documentId);

  if (parent.docType === DISCUSSION_DOC_TYPE) {
    return {
      documentId,
      scored: 0,
      noiseFiltered: 0,
      debateCount: parent.debateCount,
      answerCount: parent.answerCount,
      infoCount: parent.infoCount,
      agreeCount: parent.agreeCount,
      disagreeCount: parent.disagreeCount,
      neutralCount: parent.neutralCount,
      substantiveCount: 0,
      discussionDocumentId: null,
      discussionOutcome: "skipped",
    };
  }

  const unscored = await db
    .select({
      id: comments.id,
      content: comments.content,
      authorName: comments.authorName,
    })
    .from(comments)
    .where(and(eq(comments.documentId, documentId), isNull(comments.scoredAt)))
    .orderBy(asc(comments.publishedAt), asc(comments.createdAt));

  const scoredAt = new Date();
  let noiseFiltered = 0;
  const forLlm: {
    id: string;
    content: string;
    authorName: string | null;
  }[] = [];
  const noiseIds: string[] = [];

  for (const row of unscored) {
    if (isNoiseComment(row.content)) {
      noiseIds.push(row.id);
      noiseFiltered++;
      continue;
    }

    forLlm.push({
      id: row.id,
      content: row.content,
      authorName: row.authorName,
    });
  }

  if (noiseIds.length > 0) {
    await db
      .update(comments)
      .set({
        role: "other",
        stance: null,
        isSubstantive: false,
        scoredAt,
      })
      .where(inArray(comments.id, noiseIds));
  }

  let scoredByLlm = 0;

  if (forLlm.length > 0) {
    const systemPrompt = await resolveWorkspaceSystemPrompt(
      parent.workspaceId,
      "score_comment_stances",
    );

    for (
      let start = 0;
      start < forLlm.length;
      start += COMMENT_STANCE_BATCH_SIZE
    ) {
      const batch = forLlm.slice(start, start + COMMENT_STANCE_BATCH_SIZE);
      const indexed = batch.map((item, i) => ({
        ...item,
        index: i + 1,
      }));

      const verdicts = await scoreCommentsWithLlm({
        parentContent: parent.rawContent,
        parentTitle: parent.title,
        comments: indexed.map((item) => ({
          index: item.index,
          content: item.content,
          authorName: item.authorName,
        })),
        systemPrompt,
      });

      const verdictByIndex = new Map(
        verdicts.map((verdict) => [verdict.index, verdict]),
      );

      await Promise.all(
        indexed.map((item) => {
          const verdict = verdictByIndex.get(item.index) ?? {
            role: "other" as const,
            stance: null,
            isSubstantive: false,
          };

          scoredByLlm++;

          return db
            .update(comments)
            .set({
              role: verdict.role,
              stance: verdict.stance,
              isSubstantive: verdict.isSubstantive,
              scoredAt,
            })
            .where(eq(comments.id, item.id));
        }),
      );
    }
  }

  const counts = await recountCommentSignals(documentId);
  await db
    .update(documents)
    .set({
      debateCount: counts.debateCount,
      answerCount: counts.answerCount,
      infoCount: counts.infoCount,
      agreeCount: counts.agreeCount,
      disagreeCount: counts.disagreeCount,
      neutralCount: counts.neutralCount,
    })
    .where(eq(documents.id, documentId));

  const discussion = await syncDiscussionDocument(documentId);

  console.log(
    `[score-document-comments] document=${documentId} ` +
      `noise=${noiseFiltered} llm=${scoredByLlm} ` +
      `debate=${counts.debateCount} answer=${counts.answerCount} info=${counts.infoCount} ` +
      `agree=${counts.agreeCount} disagree=${counts.disagreeCount} ` +
      `neutral=${counts.neutralCount} substantive=${discussion.substantiveCount} ` +
      `discussion=${discussion.outcome}`,
  );

  return {
    documentId,
    scored: scoredByLlm,
    noiseFiltered,
    ...counts,
    substantiveCount: discussion.substantiveCount,
    discussionDocumentId: discussion.discussionDocumentId,
    discussionOutcome: discussion.outcome,
  };
}
