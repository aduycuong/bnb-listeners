import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  CLASSIFIER_PARENT_CONTEXT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
  MAX_PROPOSED_TERMS_PER_DOCUMENT,
  PROPOSED_TERM_DESCRIPTION_MAX_CHARS,
} from "../config";
import type {
  ClassifierDocContext,
  ProposedTerm,
  TermVocabularyHint,
} from "../types";

const proposedTermItemSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Tên term ngắn, kiểu từ khóa, phù hợp quy tắc workspace"),
  description: z
    .string()
    .min(1)
    .max(PROPOSED_TERM_DESCRIPTION_MAX_CHARS)
    .describe(
      `Một câu mô tả phạm vi term, tối đa ${PROPOSED_TERM_DESCRIPTION_MAX_CHARS} ký tự`,
    ),
});

export const proposeTermsResponseSchema = z.object({
  terms: z
    .array(proposedTermItemSchema)
    .max(MAX_PROPOSED_TERMS_PER_DOCUMENT)
    .describe(
      "Term (từ khóa/nhãn) mô tả tài liệu. Để rỗng khi tài liệu không đáng gắn term nào.",
    ),
});

function formatVocabularyHintItem(hint: TermVocabularyHint): string {
  return hint.description ? `- ${hint.name} — ${hint.description}` : `- ${hint.name}`;
}

function formatVocabularyHint(hints: TermVocabularyHint[]): string[] {
  if (hints.length === 0) {
    return [];
  }

  return [
    "Term đang dùng nhiều trong workspace (tên — mô tả phạm vi). Đây là gợi ý cách đặt tên, KHÔNG phải danh sách đóng:",
    hints.map(formatVocabularyHintItem).join("\n"),
    "",
  ];
}

function formatParentContext(
  parent: NonNullable<ClassifierDocContext["parentContext"]>,
): string[] {
  const excerpt = parent.rawContent.slice(0, CLASSIFIER_PARENT_CONTEXT_MAX_CHARS);

  return [
    "Bài gốc (chỉ là ngữ cảnh — KHÔNG đề xuất term cho bài gốc):",
    parent.title?.trim() ? `Tiêu đề: ${parent.title.trim()}` : null,
    `Trích đoạn:\n${excerpt}`,
    "",
    "Tài liệu dưới đây là phần thảo luận (bình luận) về bài gốc. Chỉ đề xuất term cho nội dung thảo luận.",
    "",
  ].filter((line): line is string => line !== null);
}

function buildUserMessage(
  doc: ClassifierDocContext,
  vocabularyHint: TermVocabularyHint[],
): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
    ...formatVocabularyHint(vocabularyHint),
    ...(doc.parentContext ? formatParentContext(doc.parentContext) : []),
    "Tài liệu:",
    `Loại: ${doc.docType}`,
    `Nguồn: ${doc.sourceOriginName}`,
    doc.title?.trim() ? `Tiêu đề: ${doc.title.trim()}` : null,
    `Nội dung:\n${contentPreview}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Asks the LLM which terms (keywords/labels) describe a document.
 *
 * Proposals are matched against existing terms by embedding similarity and a
 * judge call before anything is assigned or created, so this step does not
 * need to know the full term list — `vocabularyHint` (most-used terms with
 * their descriptions) is enough to keep naming consistent. The hint never
 * caps the output: a response may mix hint terms and brand-new terms. May
 * return an empty list.
 */
export async function proposeTermsWithLlm(
  doc: ClassifierDocContext,
  systemPrompt: string,
  vocabularyHint: TermVocabularyHint[],
): Promise<ProposedTerm[]> {
  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(proposeTermsResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(doc, vocabularyHint)),
  ]);

  return response.terms;
}
