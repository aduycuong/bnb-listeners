import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

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

const SYSTEM_PROMPT = `You are a topic designer for a real estate and marketing research system.

Propose one new topic that best describes the document's main subject. The topic should be specific enough to group similar future documents, but broad enough to be reusable.

Guidelines:
- Focus on real estate, property, hospitality, travel, or marketing themes when relevant.
- Use clear, admin-friendly naming — not jargon or overly narrow labels.
- The description should help an admin decide whether to approve, merge, or reject the topic.`;

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
export async function proposeTopicWithLlm(doc: {
  title: string | null;
  rawContent: string;
  docType: string;
  sourceName: string;
}): Promise<ProposedTopic> {
  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(proposedTopicSchema);

  return structured.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(buildUserMessage(doc)),
  ]);
}
