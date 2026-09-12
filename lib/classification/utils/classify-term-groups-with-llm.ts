import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel } from "@/lib/langchain";
import type { ClassifierTermGroup } from "@/lib/term-groups/types";
import type { LlmTermGroupAssignment } from "@/lib/term-groups/utils/apply-llm-term-group-assignments";

import {
  CLASSIFIER_CONTENT_MAX_CHARS,
  DEFAULT_CLASSIFIER_MODEL,
} from "../config";
import type { ClassifiedTermForGroups } from "../types";

const assignmentSchema = z.object({
  termId: z.uuid().describe("Id term từ danh sách được cung cấp"),
  groupIds: z
    .array(z.uuid())
    .describe(
      "Id các group phù hợp với term này. Để rỗng khi không có group phù hợp.",
    ),
});

const termGroupClassificationResponseSchema = z.object({
  assignments: z
    .array(assignmentSchema)
    .describe("Gán group cho từng term được phân loại."),
});

function formatGroupsForPrompt(groups: ClassifierTermGroup[]): string {
  return groups
    .map((group) => {
      const description = group.description?.trim()
        ? `\n  Mô tả: ${group.description.trim()}`
        : "";

      return `- id: ${group.id}\n  Tên: ${group.name}${description}`;
    })
    .join("\n\n");
}

function formatTermsForPrompt(terms: ClassifiedTermForGroups[]): string {
  return terms
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
  classifiedTerms: ClassifiedTermForGroups[],
  groups: ClassifierTermGroup[],
): string {
  const contentPreview = doc.rawContent.slice(0, CLASSIFIER_CONTENT_MAX_CHARS);

  return [
    "Danh sách term group hiện có:",
    formatGroupsForPrompt(groups),
    "",
    "Các term vừa được gán cho tài liệu:",
    formatTermsForPrompt(classifiedTerms),
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

export async function classifyTermGroupsWithLlm(
  doc: {
    title: string | null;
    rawContent: string;
    docType: string;
    sourceName: string;
  },
  classifiedTerms: ClassifiedTermForGroups[],
  groups: ClassifierTermGroup[],
  systemPrompt: string,
): Promise<LlmTermGroupAssignment[]> {
  if (classifiedTerms.length === 0 || groups.length === 0) {
    return [];
  }

  const model = createChatModel(DEFAULT_CLASSIFIER_MODEL, { temperature: 0 });
  const structured = model.withStructuredOutput(
    termGroupClassificationResponseSchema,
  );

  const response = await structured.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(buildUserMessage(doc, classifiedTerms, groups)),
  ]);

  return response.assignments.map((assignment) => ({
    termId: assignment.termId,
    groupIds: assignment.groupIds,
  }));
}
