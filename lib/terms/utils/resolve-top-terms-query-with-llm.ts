import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel, isChatModelConfigured } from "@/lib/langchain";
import type { TermGroupListItem } from "@/lib/term-groups/types";

const TOP_TERMS_QUERY_RESOLVER_MODEL = "gpt-4.1-mini" as const;

const topTermsQueryResolutionSchema = z.object({
  mode: z
    .enum(["term_group", "keyword_search"])
    .describe(
      "term_group khi user nhắc đến một nhóm term cụ thể; keyword_search khi user tìm terms theo chủ đề/từ khóa.",
    ),
  termGroupId: z
    .uuid()
    .nullable()
    .describe("Id nhóm term khớp nhất. null khi mode=keyword_search."),
  searchKeyword: z
    .string()
    .nullable()
    .describe(
      "Từ khóa rút gọn để full-text search term name/description. null khi mode=term_group.",
    ),
});

export type TopTermsQueryResolution = {
  mode: "term_group" | "keyword_search";
  termGroupId: string | null;
  searchKeyword: string | null;
};

function formatGroupsForPrompt(groups: TermGroupListItem[]): string {
  return groups
    .map((group) => {
      const description = group.description?.trim()
        ? `\n  Mô tả: ${group.description.trim()}`
        : "";

      return `- id: ${group.id}\n  Tên: ${group.name}${description}\n  Số term: ${group.memberCount}`;
    })
    .join("\n\n");
}

function buildSystemPrompt(): string {
  return [
    "Bạn phân tích câu hỏi của user để tìm top terms (từ khóa/chủ đề đang theo dõi) trong workspace.",
    "",
    "Quy tắc:",
    "- Chọn mode=term_group CHỈ KHI user rõ ràng nhắc đến một nhóm term có trong danh sách (theo tên hoặc mô tả).",
    "- Chọn mode=keyword_search khi user hỏi theo chủ đề/từ khóa chung, không trỏ vào một nhóm cụ thể.",
    "- Với keyword_search, rút gọn searchKeyword thành cụm từ ngắn gọn, phù hợp full-text search (bỏ từ thừa như 'top', 'tìm', 'terms').",
    "- Với term_group, termGroupId phải là id từ danh sách nhóm được cung cấp.",
    "- Không bịa id hoặc tên nhóm không có trong danh sách.",
  ].join("\n");
}

function buildUserMessage(query: string, groups: TermGroupListItem[]): string {
  return [
    "Danh sách nhóm term trong workspace:",
    formatGroupsForPrompt(groups),
    "",
    "Câu hỏi của user:",
    query.trim(),
  ].join("\n");
}

export async function resolveTopTermsQueryWithLlm(
  query: string,
  groups: TermGroupListItem[],
): Promise<TopTermsQueryResolution | null> {
  if (!isChatModelConfigured() || groups.length === 0) {
    return null;
  }

  const model = createChatModel(TOP_TERMS_QUERY_RESOLVER_MODEL, {
    temperature: 0,
  });
  const structured = model.withStructuredOutput(topTermsQueryResolutionSchema);

  const response = await structured.invoke([
    new SystemMessage(buildSystemPrompt()),
    new HumanMessage(buildUserMessage(query, groups)),
  ]);

  return {
    mode: response.mode,
    termGroupId: response.termGroupId,
    searchKeyword: response.searchKeyword?.trim() || null,
  };
}
