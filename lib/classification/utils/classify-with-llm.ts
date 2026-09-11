import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
} from "../config";
import type { ClassifierTerm } from "../types";

const assignmentSchema = z.object({
  id: z.uuid().describe("Term id from the provided list"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence that this term applies, from 0.0 to 1.0"),
});

const classificationResponseSchema = z.object({
  assignments: z
    .array(assignmentSchema)
    .describe(
      "Matching terms from the provided list. Empty when none apply.",
    ),
});

export type LlmTermAssignment = z.infer<typeof assignmentSchema>;

export type ClassifyWithLlmResult = {
  assignments: LlmTermAssignment[];
};

function formatTermsForPrompt(classifierTerms: ClassifierTerm[]): string {
  return classifierTerms
    .map((term) => {
      const description = term.description?.trim()
        ? `\n  Description: ${term.description.trim()}`
        : "";

      return `- id: ${term.id}\n  Name: ${term.name}${description}`;
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
  activeTerms: ClassifierTerm[],
): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
    "Available terms:",
    formatTermsForPrompt(activeTerms),
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
 * Calls the LLM classifier to match a document against existing terms.
 */
export async function classifyWithLlm(
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  },
  classifierTerms: ClassifierTerm[],
  systemPrompt: string,
): Promise<ClassifyWithLlmResult> {
  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(classificationResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(doc, classifierTerms)),
  ]);

  return { assignments: response.assignments };
}
