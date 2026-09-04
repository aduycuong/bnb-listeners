import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import { buildClassifyTopicsSystemPrompt } from "@/lib/llm/utils/build-system-prompts";
import type { WorkspaceLlmSettings } from "@/lib/workspaces/types";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
} from "../config";
import type { ClassifierTopic } from "../types";

const assignmentSchema = z.object({
  id: z.uuid().describe("Topic id from the provided list"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence that this topic applies, from 0.0 to 1.0"),
});

const classificationResponseSchema = z.object({
  assignments: z
    .array(assignmentSchema)
    .describe(
      "Matching topics from the provided list. Empty when none apply.",
    ),
});

export type LlmTopicAssignment = z.infer<typeof assignmentSchema>;

export type ClassifyWithLlmResult = {
  assignments: LlmTopicAssignment[];
};

function formatTopicsForPrompt(classifierTopics: ClassifierTopic[]): string {
  return classifierTopics
    .map((topic) => {
      const parent = topic.parentName ? ` (parent: ${topic.parentName})` : "";
      const description = topic.description?.trim()
        ? `\n  Description: ${topic.description.trim()}`
        : "";

      return `- id: ${topic.id}\n  Name: ${topic.name}${parent}${description}`;
    })
    .join("\n\n");
}

function buildUserMessage(
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  },
  activeTopics: ClassifierTopic[],
): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
    "Available topics:",
    formatTopicsForPrompt(activeTopics),
    "",
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
 * Calls the LLM classifier to match a document against existing topics.
 */
export async function classifyWithLlm(
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  },
  classifierTopics: ClassifierTopic[],
  llmSettings: WorkspaceLlmSettings,
): Promise<ClassifyWithLlmResult> {
  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(classificationResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(buildClassifyTopicsSystemPrompt(llmSettings)),
    new HumanMessage(buildUserMessage(doc, classifierTopics)),
  ]);

  return { assignments: response.assignments };
}
