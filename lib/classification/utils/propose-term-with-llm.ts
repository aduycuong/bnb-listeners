import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
  MAX_PROPOSED_TERMS_PER_DOCUMENT,
} from "../config";
import type { ProposedTerm } from "../types";

const proposedTermItemSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Tên term ngắn, kiểu từ khóa, phù hợp quy tắc workspace"),
  description: z
    .string()
    .min(1)
    .max(500)
    .describe("Một hoặc hai câu mô tả phạm vi term"),
});

export const proposeTermsResponseSchema = z.object({
  terms: z
    .array(proposedTermItemSchema)
    .max(MAX_PROPOSED_TERMS_PER_DOCUMENT)
    .describe(
      "Term mới đề xuất. Để rỗng khi không nên tạo term nào cho tài liệu này.",
    ),
});

function buildUserMessage(doc: {
  title: string | null;
  rawContent: string;
  docType: string;
  sourceName: string;
}): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
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
 * Asks the LLM to propose new terms for a document that matched nothing existing.
 * May return an empty list when no new term is appropriate.
 */
export async function proposeTermsWithLlm(
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  },
  systemPrompt: string,
): Promise<ProposedTerm[]> {
  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(proposeTermsResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(doc)),
  ]);

  return response.terms;
}
