import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
} from "../config";
import type { ClassifierTerm } from "../types";

const assignmentSchema = z.object({
  id: z.uuid().describe("Id term từ danh sách được cung cấp"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Độ tin cậy term áp dụng, từ 0.0 đến 1.0"),
});

const classificationResponseSchema = z.object({
  assignments: z
    .array(assignmentSchema)
    .describe(
      "Các term khớp từ danh sách. Để rỗng khi không có term phù hợp.",
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
        ? `\n  Mô tả: ${term.description.trim()}`
        : "";

      return `- id: ${term.id}\n  Tên: ${term.name}${description}`;
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
    "Danh sách term hiện có:",
    formatTermsForPrompt(activeTerms),
    "",
    "Tài liệu:",
    `Loại: ${doc.docType}`,
    `Nguồn: ${doc.sourceName}`,
    doc.title?.trim() ? `Tiêu đề: ${doc.title.trim()}` : null,
    `Nội dung:\n${contentPreview}`,
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
