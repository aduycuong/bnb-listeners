import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import { DEFAULT_RELEVANCE_MODEL } from "../config";

const relevanceResponseSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(10)
    .describe("Relevance score from 0 to 10"),
});

const SYSTEM_PROMPT = `You are a content relevance evaluator for a real estate and marketing research system.

Rate how relevant the following content is to real estate and/or marketing on a scale of 0 to 10.

Scoring guide:
  0  = Completely unrelated (sports, cooking, entertainment, etc.)
  3  = Loosely related (general business, economy, tourism)
  5  = Somewhat relevant (construction, urban development, advertising)
  7  = Clearly relevant (property news, market trends, digital marketing)
  10 = Highly relevant (property listings, price analysis, real estate marketing strategy)`;

/**
 * Scores content relevance to real estate and marketing using an LLM.
 * Uses structured output to guarantee a valid numeric score.
 * Trims content to 2 000 characters to control token cost.
 *
 * @returns Score in [0, 1]. Higher = more relevant.
 */
export async function scoreRelevance(
  rawContent: string,
  title: string | null | undefined,
): Promise<number> {
  const model = createChatModel(DEFAULT_RELEVANCE_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(relevanceResponseSchema);

  const contentPreview = rawContent.slice(0, 2_000);
  const userMessage = [
    title?.trim() ? `Title: ${title}` : null,
    `Content:\n${contentPreview}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await structured.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ]);

  return response.score / 10;
}
