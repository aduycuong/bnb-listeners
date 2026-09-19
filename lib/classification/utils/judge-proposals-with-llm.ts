import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  CLASSIFIER_PARENT_CONTEXT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
} from "../config";
import type { ClassifierDocContext, ProposedTerm } from "../types";
import type { TermCandidate } from "./find-candidate-terms-by-embeddings";

export const PROPOSAL_DECISION_KINDS = ["existing", "new", "skip"] as const;

const judgeDecisionSchema = z.object({
  proposalIndex: z
    .int()
    .min(0)
    .describe("Số thứ tự của đề xuất (#N trong danh sách)"),
  decision: z
    .enum(PROPOSAL_DECISION_KINDS)
    .describe(
      "existing: gán term hiện có trong nhóm của đề xuất; new: tạo term mới từ đề xuất; skip: bỏ qua đề xuất",
    ),
  termId: z
    .uuid()
    .nullable()
    .describe(
      "Id term hiện có trong nhóm của đề xuất khi decision=existing; null khi new hoặc skip",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Mức tài liệu thực sự nói về term này, từ 0.0 đến 1.0; 0 khi skip"),
});

const judgeResponseSchema = z.object({
  decisions: z
    .array(judgeDecisionSchema)
    .describe("Đúng một quyết định cho mỗi đề xuất, theo thứ tự đầu vào"),
});

/** Raw per-proposal decision returned by the judge LLM (not yet validated). */
export type LlmProposalDecision = z.infer<typeof judgeDecisionSchema>;

/** One proposal plus the nearest existing terms retrieved for it. */
export type JudgeProposalInput = {
  proposal: ProposedTerm;
  /** Best candidate first; may be empty. */
  candidates: TermCandidate[];
};

function formatCandidate(candidate: TermCandidate): string {
  const description = candidate.term.description?.trim()
    ? `\n    Mô tả: ${candidate.term.description.trim()}`
    : "";

  return [
    `  - id: ${candidate.term.id}  (độ tương đồng ${candidate.similarity.toFixed(2)})`,
    `    Tên: ${candidate.term.name}${description}`,
  ].join("\n");
}

function formatProposal(input: JudgeProposalInput, index: number): string {
  const candidates =
    input.candidates.length > 0
      ? `  Term hiện có gần nghĩa:\n${input.candidates.map(formatCandidate).join("\n")}`
      : "  Term hiện có gần nghĩa: (không có)";

  return [
    `Đề xuất #${index}`,
    `  Tên: ${input.proposal.name}`,
    `  Mô tả: ${input.proposal.description}`,
    candidates,
  ].join("\n");
}

function formatParentContext(
  parent: NonNullable<ClassifierDocContext["parentContext"]>,
): string[] {
  const excerpt = parent.rawContent.slice(0, CLASSIFIER_PARENT_CONTEXT_MAX_CHARS);

  return [
    "",
    "Bài gốc (chỉ là ngữ cảnh — KHÔNG phân loại bài gốc):",
    parent.title?.trim() ? `Tiêu đề: ${parent.title.trim()}` : null,
    `Trích đoạn:\n${excerpt}`,
    "",
    "Tài liệu dưới đây là phần thảo luận (bình luận) về bài gốc. " +
      "Quyết định dựa trên nội dung thảo luận; term của bài gốc chỉ chọn khi thảo luận thực sự nói về nó.",
  ].filter((line): line is string => line !== null);
}

function buildUserMessage(
  doc: ClassifierDocContext,
  inputs: JudgeProposalInput[],
): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
    "Các term được đề xuất cho tài liệu, kèm term hiện có gần nghĩa nhất (nếu có).",
    "Với mỗi đề xuất, trả đúng MỘT quyết định: existing (gán term hiện có trong nhóm), new (tạo term mới) hoặc skip (bỏ qua).",
    "",
    inputs.map(formatProposal).join("\n\n"),
    ...(doc.parentContext ? formatParentContext(doc.parentContext) : []),
    "",
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
 * Asks the judge LLM to decide, per proposal, whether the document maps onto
 * an existing candidate term, warrants a brand-new term, or should be dropped.
 *
 * Output is raw: ids are not checked against the candidate lists and the
 * duplicate-similarity hard rule is not applied. See resolveProposalDecisions.
 */
export async function judgeProposalsWithLlm(
  doc: ClassifierDocContext,
  inputs: JudgeProposalInput[],
  systemPrompt: string,
): Promise<LlmProposalDecision[]> {
  if (inputs.length === 0) {
    return [];
  }

  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(judgeResponseSchema);

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(doc, inputs)),
  ]);

  return response.decisions;
}
