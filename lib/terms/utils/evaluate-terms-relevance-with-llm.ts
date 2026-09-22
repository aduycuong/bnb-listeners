import { HumanMessage } from "@langchain/core/messages";
import { createAgent, tool, toolCallLimitMiddleware } from "langchain";
import { z } from "zod";

import { exaAnswer, isExaConfigured } from "@/lib/exa/services/exa-answer";
import { createChatModel, type ChatModelId } from "@/lib/langchain";

import {
  TOP_TERMS_RELEVANCE_MAX_WEB_QUERIES,
  TOP_TERMS_RELEVANCE_MODEL,
} from "../top-terms-config";
import type { TermSelectionCriteria } from "../types";

const AGENT_RECURSION_LIMIT = 30;
const EXA_TOOL_NAME = "exa_answer";

const relevanceItemSchema = z.object({
  termId: z.uuid().describe("Id term từ danh sách được cung cấp"),
  relevant: z
    .boolean()
    .describe("True khi term thực sự liên quan tới chủ đề/câu hỏi của user"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Độ tin cậy term liên quan tới chủ đề, từ 0.0 đến 1.0"),
});

const relevanceResponseSchema = z.object({
  results: z
    .array(relevanceItemSchema)
    .describe("Một kết quả cho mỗi term được cung cấp"),
});

export type TermRelevanceInput = {
  id: string;
  name: string;
  description: string | null;
};

export type TermRelevanceEvaluation = z.infer<typeof relevanceItemSchema>;

export type EvaluateTermsRelevanceParams = {
  query: string;
  selectionCriteria?: TermSelectionCriteria;
  terms: TermRelevanceInput[];
  model?: ChatModelId;
  enableWebResearch?: boolean;
};

export type EvaluateTermsRelevanceResult = {
  results: TermRelevanceEvaluation[];
  webQueries: number;
};

/**
 * Per-invocation tool so executed lookups can be counted exactly (the agent
 * may request more tool calls than the limit middleware lets through).
 */
function createExaAnswerTool(onExecuted: () => void) {
  return tool(
    async ({ query }) => {
      onExecuted();
      const result = await exaAnswer({ query, text: true });
      return result.answer;
    },
    {
      name: EXA_TOOL_NAME,
      description:
        "Tra cứu web qua Exa để làm rõ một term (tên dự án, thương hiệu, địa danh, thực thể, thuật ngữ) khi tên/mô tả không đủ để biết term có liên quan tới chủ đề đang xét hay không. Đặt câu hỏi đầy đủ ngữ cảnh (tên term + chủ đề) trong query.",
      schema: z.object({
        query: z
          .string()
          .min(1)
          .describe("Câu hỏi tra cứu web — gồm tên term và chủ đề cần đối chiếu."),
      }),
    },
  );
}

function buildSystemPrompt(webResearchAvailable: boolean): string {
  const lines = [
    "Bạn đánh giá xem từng term (từ khóa/chủ đề đang theo dõi trong workspace) có thỏa MỌI tiêu chí chọn term của user hay không.",
    "",
    "Quy tắc:",
    "- relevant=true CHỈ KHI term thuộc chủ đề/candidate scope VÀ thỏa toàn bộ tiêu chí INCLUDE, đồng thời không thuộc bất kỳ tiêu chí EXCLUDE nào.",
    "- Các tiêu chí chọn term là predicate bắt buộc, không chỉ là gợi ý về mức độ liên quan. Một term nói về lĩnh vực nhưng sai loại thực thể phải là relevant=false.",
    "- Ví dụ: INCLUDE yêu cầu tên dự án bất động sản cụ thể thì relevant=true chỉ cho tên một dự án xác định; thị trường, giá, chính sách, loại hình bất động sản và tin tức chung đều relevant=false dù có liên quan.",
    "- Không đánh dấu liên quan chỉ vì trùng vài từ hoặc có cùng lĩnh vực; khi nghi ngờ, chọn relevant=false.",
    "- Khi nghi ngờ, chọn relevant=false. Mục tiêu là danh sách term gọn và chính xác, không phải đầy đủ.",
    "- confidence cao (≥ 0.85) khi tên/mô tả rõ ràng; thấp hơn khi phải suy luận.",
    "- Trả về đúng một kết quả cho MỖI term trong danh sách, dùng đúng id được cung cấp. Không bịa id.",
  ];

  if (webResearchAvailable) {
    lines.push(
      "",
      `Công cụ ${EXA_TOOL_NAME} (tra cứu web) chỉ dành cho term thật sự mơ hồ: tên riêng lạ, viết tắt, dự án/thương hiệu/địa danh bạn không biết. Term có tên/mô tả đủ rõ để quyết định thì KHÔNG tra cứu.`,
      `Tối đa ${TOP_TERMS_RELEVANCE_MAX_WEB_QUERIES} lần tra cứu cho cả danh sách; ưu tiên các term mơ hồ nhất. Quyết định các term còn lại dựa trên tên/mô tả.`,
    );
  }

  return lines.join("\n");
}

function formatTermsForPrompt(terms: TermRelevanceInput[]): string {
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
  query: string,
  selectionCriteria: TermSelectionCriteria | undefined,
  terms: TermRelevanceInput[],
): string {
  return [
    "Chủ đề dùng để tìm term ứng viên:",
    query.trim(),
    "",
    "Tiêu chí bắt buộc để chọn term:",
    `- INCLUDE: ${selectionCriteria?.include ?? "Term phải trực tiếp nói về chủ đề."}`,
    `- EXCLUDE: ${selectionCriteria?.exclude ?? "None"}`,
    "",
    "Danh sách term cần đánh giá:",
    formatTermsForPrompt(terms),
  ].join("\n");
}

/**
 * Judges whether each term relates to the user's query using an agent that
 * may consult Exa (web) for ambiguous term names. Returns one verdict per
 * term (unknown ids are dropped).
 */
export async function evaluateTermsRelevanceWithLlm(
  params: EvaluateTermsRelevanceParams,
): Promise<EvaluateTermsRelevanceResult> {
  if (params.terms.length === 0) {
    return { results: [], webQueries: 0 };
  }

  const webResearchAvailable =
    (params.enableWebResearch ?? true) && isExaConfigured();
  const chatModel = createChatModel(params.model ?? TOP_TERMS_RELEVANCE_MODEL, {
    temperature: 0,
  });

  let webQueries = 0;
  const exaAnswerTool = createExaAnswerTool(() => {
    webQueries += 1;
  });

  const agent = createAgent({
    model: chatModel,
    tools: webResearchAvailable ? [exaAnswerTool] : [],
    systemPrompt: buildSystemPrompt(webResearchAvailable),
    responseFormat: relevanceResponseSchema,
    middleware: [
      toolCallLimitMiddleware({
        threadLimit: TOP_TERMS_RELEVANCE_MAX_WEB_QUERIES,
        runLimit: TOP_TERMS_RELEVANCE_MAX_WEB_QUERIES,
      }),
    ],
  });

  const result = await agent.invoke(
    {
      messages: [
        new HumanMessage(
          buildUserMessage(
            params.query,
            params.selectionCriteria,
            params.terms,
          ),
        ),
      ],
    },
    { recursionLimit: AGENT_RECURSION_LIMIT },
  );

  const parsed = relevanceResponseSchema.safeParse(result.structuredResponse);
  if (!parsed.success) {
    throw new Error("Agent did not return a valid term relevance evaluation.");
  }

  const allowedIds = new Set(params.terms.map((term) => term.id));

  return {
    results: parsed.data.results.filter((item) => allowedIds.has(item.termId)),
    webQueries,
  };
}
