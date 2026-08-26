import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import { buildProposeTopicSystemPrompt } from "@/lib/llm/utils/build-system-prompts";
import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
} from "../config";

export const proposedTopicSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Short, specific topic name suitable for admin review"),
  description: z
    .string()
    .min(1)
    .max(500)
    .describe("One or two sentences describing what this topic covers"),
});

export type ProposedTopic = z.infer<typeof proposedTopicSchema>;

function buildUserMessage(doc: {
  title: string | null;
  rawContent: string;
  docType: string;
  sourceName: string;
}): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
    "Document:",
    `Type: ${doc.docType}`,
    `Source: ${doc.sourceName}`,
    doc.title?.trim() ? `Title: ${doc.title.trim()}` : null,
    `Content:\n${contentPreview}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Asks the LLM to propose a new topic for a document that matched nothing existing.
 */
export async function proposeTopicWithLlm(
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  },
  llmSettings: WorkspaceLlmSettings,
): Promise<ProposedTopic> {
  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(proposedTopicSchema);

  return structured.invoke([
    new SystemMessage(buildProposeTopicSystemPrompt(llmSettings)),
    new HumanMessage(buildUserMessage(doc)),
  ]);
}
