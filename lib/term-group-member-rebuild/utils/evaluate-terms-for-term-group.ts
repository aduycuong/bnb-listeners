import { HumanMessage } from "@langchain/core/messages";
import { createAgent, toolCallLimitMiddleware } from "langchain";
import { z } from "zod";

import { createChatModel, type ChatModelId } from "@/lib/langchain";
import { isExaConfigured } from "@/lib/exa/services/exa-answer";

import { exaAnswerTool } from "./exa-answer-tool";

const evaluationItemSchema = z.object({
  termId: z.uuid().describe("Id term từ danh sách được cung cấp"),
  belongs: z
    .boolean()
    .describe("True khi term thực sự thuộc term group đang xét"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Độ tin cậy term thuộc group, từ 0.0 đến 1.0"),
});

const evaluationResponseSchema = z.object({
  results: z
    .array(evaluationItemSchema)
    .describe("Một kết quả cho mỗi term được cung cấp"),
});

export type EvaluateTermInput = {
  id: string;
  name: string;
  description: string | null;
};

export type TermGroupEvaluation = z.infer<typeof evaluationItemSchema>;

export type EvaluateTermsForTermGroupResult = {
  results: TermGroupEvaluation[];
  usage: { inputTokens: number; outputTokens: number };
  webQueries: number;
};

const AGENT_RECURSION_LIMIT = 30;

function formatTermsForPrompt(terms: EvaluateTermInput[]): string {
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
  group: { name: string; description: string | null },
  terms: EvaluateTermInput[],
): string {
  const groupDescription = group.description?.trim()
    ? `\nMô tả group: ${group.description.trim()}`
    : "";

  return [
    "Term group cần xét:",
    `Tên: ${group.name.trim()}${groupDescription}`,
    "",
    "Danh sách term cần đánh giá:",
    formatTermsForPrompt(terms),
  ].join("\n");
}

function countWebQueries(messages: unknown[]): number {
  let count = 0;

  for (const message of messages) {
    if (
      message &&
      typeof message === "object" &&
      "tool_calls" in message &&
      Array.isArray((message as { tool_calls: unknown[] }).tool_calls)
    ) {
      for (const toolCall of (message as { tool_calls: Array<{ name?: string }> })
        .tool_calls) {
        if (toolCall.name === "exa_answer") {
          count += 1;
        }
      }
    }
  }

  return count;
}

function extractUsage(messages: unknown[]): {
  inputTokens: number;
  outputTokens: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const message of messages) {
    if (
      message &&
      typeof message === "object" &&
      "usage_metadata" in message &&
      message.usage_metadata &&
      typeof message.usage_metadata === "object"
    ) {
      const usage = message.usage_metadata as {
        input_tokens?: number;
        output_tokens?: number;
      };

      inputTokens += usage.input_tokens ?? 0;
      outputTokens += usage.output_tokens ?? 0;
    }
  }

  return { inputTokens, outputTokens };
}

/**
 * Evaluates whether each term belongs to a single term group.
 * Uses an agent with optional Exa Answer web research when enabled.
 */
export async function evaluateTermsForTermGroup(
  group: { name: string; description: string | null },
  terms: EvaluateTermInput[],
  systemPrompt: string,
  model: ChatModelId,
  enableWebResearch: boolean,
): Promise<EvaluateTermsForTermGroupResult> {
  if (terms.length === 0) {
    return {
      results: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      webQueries: 0,
    };
  }

  const webResearchAvailable = enableWebResearch && isExaConfigured();
  const tools = webResearchAvailable ? [exaAnswerTool] : [];
  const chatModel = createChatModel(model, { temperature: 0 });

  const agent = createAgent({
    model: chatModel,
    tools,
    systemPrompt: webResearchAvailable
      ? `${systemPrompt}\n\nBạn có thể gọi công cụ exa_answer khi tên hoặc mô tả term quá mơ hồ và cần tra cứu web để quyết định chính xác. Không gọi khi đã đủ thông tin từ tên/mô tả.`
      : systemPrompt,
    responseFormat: evaluationResponseSchema,
    middleware: [toolCallLimitMiddleware({ threadLimit: 20, runLimit: 20 })],
  });

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(buildUserMessage(group, terms))],
    },
    { recursionLimit: AGENT_RECURSION_LIMIT },
  );

  const parsed = evaluationResponseSchema.safeParse(result.structuredResponse);
  if (!parsed.success) {
    throw new Error("Agent did not return a valid term group evaluation.");
  }

  const allowedIds = new Set(terms.map((term) => term.id));
  const messages = Array.isArray(result.messages) ? result.messages : [];

  return {
    results: parsed.data.results.filter((item) => allowedIds.has(item.termId)),
    usage: extractUsage(messages),
    webQueries: countWebQueries(messages),
  };
}
