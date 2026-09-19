import { HumanMessage } from "@langchain/core/messages";
import { createAgent, toolCallLimitMiddleware } from "langchain";
import { z } from "zod";

import { isExaConfigured } from "@/lib/exa/services/exa-answer";
import { createChatModel, type ChatModelId } from "@/lib/langchain";
import { exaAnswerTool } from "@/lib/term-group-member-rebuild/utils/exa-answer-tool";

import type { ClassifiedTermForGroups, ClassifierTermGroup } from "../types";

const membershipItemSchema = z.object({
  termId: z.uuid().describe("Id term từ danh sách được cung cấp"),
  groupId: z.uuid().describe("Id group từ danh sách được cung cấp"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Độ tin cậy term thuộc group, từ 0.0 đến 1.0"),
});

const membershipResponseSchema = z.object({
  memberships: z
    .array(membershipItemSchema)
    .describe(
      "Một mục cho mỗi cặp (term, group) mà term thực sự thuộc group. Bỏ qua các cặp không thuộc.",
    ),
});

export type TermGroupMembershipEvaluation = z.infer<
  typeof membershipItemSchema
>;

const AGENT_RECURSION_LIMIT = 30;

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
  terms: ClassifiedTermForGroups[],
  groups: ClassifierTermGroup[],
): string {
  return [
    "Danh sách term group hiện có:",
    formatGroupsForPrompt(groups),
    "",
    "Danh sách term cần đánh giá:",
    formatTermsForPrompt(terms),
  ].join("\n");
}

/**
 * Evaluates which term groups each term belongs to, in a single agent call.
 *
 * Same mechanism as the member rebuild evaluator (agent + optional Exa web
 * research + per-membership confidence), but across every group of the
 * workspace at once instead of one group per call. Returns only the
 * (term, group) pairs the LLM judged as belonging; callers apply the
 * confidence threshold.
 */
export async function evaluateTermsForTermGroups(
  terms: ClassifiedTermForGroups[],
  groups: ClassifierTermGroup[],
  systemPrompt: string,
  model: ChatModelId,
  enableWebResearch: boolean,
): Promise<TermGroupMembershipEvaluation[]> {
  if (terms.length === 0 || groups.length === 0) {
    return [];
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
    responseFormat: membershipResponseSchema,
    middleware: [toolCallLimitMiddleware({ threadLimit: 20, runLimit: 20 })],
  });

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(buildUserMessage(terms, groups))],
    },
    { recursionLimit: AGENT_RECURSION_LIMIT },
  );

  const parsed = membershipResponseSchema.safeParse(result.structuredResponse);
  if (!parsed.success) {
    throw new Error("Agent did not return a valid term group membership evaluation.");
  }

  const allowedTermIds = new Set(terms.map((term) => term.id));
  const allowedGroupIds = new Set(groups.map((group) => group.id));

  return parsed.data.memberships.filter(
    (item) =>
      allowedTermIds.has(item.termId) && allowedGroupIds.has(item.groupId),
  );
}
