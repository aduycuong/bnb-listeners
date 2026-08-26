import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import { buildScoreRelevanceSystemPrompt } from "@/lib/llm/utils/build-system-prompts";
import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import { DEFAULT_RELEVANCE_MODEL } from "../config";

const relevanceResponseSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(10)
    .describe("Relevance score from 0 to 10"),
});

/**
 * Scores content relevance to the workspace topic scope using an LLM.
 * Uses structured output to guarantee a valid numeric score.
 * Trims content to 2 000 characters to control token cost.
 *
 * @returns Score in [0, 1]. Higher = more relevant.
 */
export async function scoreRelevance(
  rawContent: string,
  title: string | null | undefined,
  llmSettings: WorkspaceLlmSettings,
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
    new SystemMessage(buildScoreRelevanceSystemPrompt(llmSettings)),
    new HumanMessage(userMessage),
  ]);

  return response.score / 10;
}
