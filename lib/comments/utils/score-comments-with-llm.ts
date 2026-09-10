import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

import {
  COMMENT_CONTENT_MAX_CHARS,
  COMMENT_STANCE_MODEL,
  PARENT_CONTENT_MAX_CHARS,
} from "../config";
import { commentRoleSchema, commentStanceSchema } from "../schema";
import type { CommentScoreVerdict } from "../types";

const verdictSchema = z.object({
  index: z.int().describe("1-based index matching the numbered comment list"),
  role: commentRoleSchema.describe(
    "debate | answer | info | other — communicative role relative to the post",
  ),
  stance: commentStanceSchema
    .nullable()
    .describe(
      "agree | disagree | neutral when role is debate; null for every other role",
    ),
  isSubstantive: z
    .boolean()
    .describe(
      "true when the comment carries a real argument, answer, or useful information worth retrieving",
    ),
});

const responseSchema = z.object({
  results: z
    .array(verdictSchema)
    .describe("One verdict per input comment, same indexes"),
});

export type ScoreCommentsWithLlmParams = {
  parentContent: string;
  parentTitle: string | null;
  comments: { index: number; content: string; authorName: string | null }[];
  systemPrompt: string;
};

/**
 * Scores a batch of comments for role, stance, and substance in one LLM call.
 * Missing indexes fall back to other / non-substantive so a partial model
 * response cannot leave rows unscored forever.
 */
export async function scoreCommentsWithLlm(
  params: ScoreCommentsWithLlmParams,
): Promise<CommentScoreVerdict[]> {
  const { parentContent, parentTitle, comments, systemPrompt } = params;

  if (comments.length === 0) return [];

  const model = createChatModel(COMMENT_STANCE_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(responseSchema);

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(parentTitle, parentContent, comments)),
  ]);

  const byIndex = new Map(
    response.results.map((result) => [result.index, result]),
  );

  return comments.map((comment) => {
    const verdict = byIndex.get(comment.index);

    if (!verdict) {
      return {
        index: comment.index,
        role: "other" as const,
        stance: null,
        isSubstantive: false,
      };
    }

    const role = verdict.role;
    const stance =
      role === "debate" ? (verdict.stance ?? "neutral") : null;

    return {
      index: verdict.index,
      role,
      stance,
      isSubstantive: role === "other" ? false : verdict.isSubstantive,
    };
  });
}

function buildUserMessage(
  parentTitle: string | null,
  parentContent: string,
  comments: { index: number; content: string; authorName: string | null }[],
): string {
  const titleLine = parentTitle?.trim()
    ? `Title: ${parentTitle.trim()}`
    : null;

  const commentLines = comments.map((comment) => {
    const author = comment.authorName?.trim() || "ẩn danh";
    const body = comment.content.slice(0, COMMENT_CONTENT_MAX_CHARS);
    return `[${comment.index}] ${author}: ${body}`;
  });

  return [
    "Parent post:",
    titleLine,
    parentContent.slice(0, PARENT_CONTENT_MAX_CHARS),
    "",
    "Comments:",
    ...commentLines,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
