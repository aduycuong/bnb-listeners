import { and, eq, inArray, isNull } from "drizzle-orm";

import { comments, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { addJob } from "@/lib/qstash/services/add-job-service";

import { SCORE_DOCUMENT_COMMENTS_JOB_NAME } from "../config";
import { upsertCommentsParamsSchema } from "../schema";
import type { UpsertCommentsParams, UpsertCommentsResult } from "../types";

/**
 * Upserts comments for a parent document, then dispatches batch stance scoring.
 *
 * Dedup key is (documentId, sourceId). Content changes clear stance fields so
 * the scorer re-evaluates; identical content only refreshes likeCount/metadata.
 *
 * Scoring is dispatched whenever any comment on the document is still
 * unscored after the write — including leftovers from a prior failed run.
 */
export async function upsertComments(
  params: UpsertCommentsParams,
  userId = "system",
): Promise<UpsertCommentsResult> {
  const parsed = upsertCommentsParamsSchema.parse(params);
  const { documentId, comments: items } = parsed;

  const [parent] = await db
    .select({
      id: documents.id,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!parent) throw new NotFoundError("document", documentId);

  const sourceIds = items.map((item) => item.sourceId);
  const existingRows = await db
    .select({
      id: comments.id,
      sourceId: comments.sourceId,
      content: comments.content,
    })
    .from(comments)
    .where(
      and(
        eq(comments.documentId, documentId),
        inArray(comments.sourceId, sourceIds),
      ),
    );

  const existingBySourceId = new Map(
    existingRows.map((row) => [row.sourceId, row]),
  );

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of items) {
    const existing = existingBySourceId.get(item.sourceId);
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
    const likeCount = item.likeCount ?? 0;
    const metadata = item.metadata ?? {};
    const content = item.content;

    if (!existing) {
      await db.insert(comments).values({
        workspaceId: parent.workspaceId,
        documentId,
        sourceId: item.sourceId,
        authorName: item.authorName ?? null,
        authorId: item.authorId ?? null,
        content,
        likeCount,
        publishedAt,
        metadata,
      });
      inserted++;
      continue;
    }

    if (existing.content !== content) {
      await db
        .update(comments)
        .set({
          authorName: item.authorName ?? null,
          authorId: item.authorId ?? null,
          content,
          likeCount,
          publishedAt,
          metadata,
          stance: null,
          role: null,
          isSubstantive: null,
          scoredAt: null,
        })
        .where(eq(comments.id, existing.id));
      updated++;
      continue;
    }

    await db
      .update(comments)
      .set({
        authorName: item.authorName ?? null,
        authorId: item.authorId ?? null,
        likeCount,
        publishedAt,
        metadata,
      })
      .where(eq(comments.id, existing.id));
    unchanged++;
  }

  const shouldDispatch = await hasUnscoredComments(documentId);

  if (shouldDispatch) {
    await addJob({
      jobName: SCORE_DOCUMENT_COMMENTS_JOB_NAME,
      payload: { documentId },
      userId,
    });
  }

  return {
    documentId,
    inserted,
    updated,
    unchanged,
    dispatched: shouldDispatch,
  };
}

async function hasUnscoredComments(documentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.documentId, documentId), isNull(comments.scoredAt)))
    .limit(1);

  return Boolean(row);
}
