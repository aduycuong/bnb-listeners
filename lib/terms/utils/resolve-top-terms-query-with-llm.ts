import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

import { createChatModel, isChatModelConfigured } from "@/lib/langchain";

const TOP_TERMS_QUERY_RESOLVER_MODEL = "gpt-4.1-mini" as const;

const topTermsQueryResolutionSchema = z.object({
  searchKeyword: z
    .string()
    .nullable()
    .describe(
      "Từ khóa rút gọn để full-text search term name/description.",
    ),
});

export type TopTermsQueryResolution = {
  searchKeyword: string | null;
};

function buildSystemPrompt(): string {
  return [
    "Bạn phân tích câu hỏi của user để tìm top terms (từ khóa/chủ đề đang theo dõi) trong workspace.",
    "",
    "Quy tắc:",
    "- Rút gọn searchKeyword thành cụm từ ngắn gọn, phù hợp full-text search (bỏ từ thừa như 'top', 'tìm', 'terms').",
  ].join("\n");
}

function buildUserMessage(query: string): string {
  return ["Câu hỏi của user:", query.trim()].join("\n");
}

export async function resolveTopTermsQueryWithLlm(
  query: string,
): Promise<TopTermsQueryResolution | null> {
  if (!isChatModelConfigured()) {
    return null;
  }

  const model = createChatModel(TOP_TERMS_QUERY_RESOLVER_MODEL, {
    temperature: 0,
  });
  const structured = model.withStructuredOutput(topTermsQueryResolutionSchema);

  const response = await structured.invoke([
    new SystemMessage(buildSystemPrompt()),
    new HumanMessage(buildUserMessage(query)),
  ]);

  return {
    searchKeyword: response.searchKeyword?.trim() || null,
  };
}
