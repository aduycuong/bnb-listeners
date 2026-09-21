import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { RESEARCH_FAST_MODEL } from "../../config";
import { researchPlanSchema } from "../../schema";
import type { ResearchGraphContext, ResearchStateType } from "../state";

const PLAN_SYSTEM_PROMPT = [
  "You are a research planner for a social-listening knowledge base.",
  "Given a research goal and its background, break it into a short plan of",
  "key sub-questions, then propose concrete search queries to answer them.",
  "Queries should be specific, in the language most likely used by the source",
  "content, and cover distinct angles (avoid near-duplicates).",
].join(" ");

function buildPlanUserMessage(
  query: string,
  background: string,
  maxSubQueries: number,
): string {
  return [
    `Research goal:\n${query}`,
    background ? `\nBackground:\n${background}` : "",
    `\nProduce at most ${maxSubQueries} search queries.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createPlanNode(ctx: ResearchGraphContext) {
  return async (
    state: ResearchStateType,
  ): Promise<Partial<ResearchStateType>> => {
    const model = createChatModel(RESEARCH_FAST_MODEL, { temperature: 0.2 });
    const structured = model.withStructuredOutput(researchPlanSchema);

    const result = await structured.invoke([
      new SystemMessage(PLAN_SYSTEM_PROMPT),
      new HumanMessage(
        buildPlanUserMessage(state.query, state.background, ctx.maxSubQueries),
      ),
    ]);

    return {
      plan: result.plan,
      subQueries: result.subQueries.slice(0, ctx.maxSubQueries),
    };
  };
}
