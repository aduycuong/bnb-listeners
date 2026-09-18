import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { TEXT_SCORING_MAX_CHARS, TEXT_SCORING_MODEL } from "../config";
import type { PartScores } from "../types";
import {
  partScoreResponseSchema,
  toPartScores,
} from "./part-score-response-schema";

export type ScoreTextPartParams = {
  title: string | null | undefined;
  text: string;
  systemPrompt: string;
};

/**
 * Scores the text body of a document on relevance and detail.
 * The title is included because it is part of the same textual unit.
 */
export async function scoreTextPart(
  params: ScoreTextPartParams,
): Promise<PartScores> {
  const model = createChatModel(TEXT_SCORING_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(partScoreResponseSchema);

  const preview = params.text.slice(0, TEXT_SCORING_MAX_CHARS);
  const userMessage = [
    params.title?.trim() ? `Tiêu đề: ${params.title.trim()}` : null,
    `Nội dung:\n${preview}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await structured.invoke([
    new SystemMessage(params.systemPrompt),
    new HumanMessage(userMessage),
  ]);

  return toPartScores(response);
}
