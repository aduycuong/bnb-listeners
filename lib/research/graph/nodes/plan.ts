import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { RESEARCH_FAST_MODEL } from "../../config";
import { researchPlanSchema } from "../../schema";
import { buildTaskGuidance } from "../../utils/build-task-guidance";
import type { ResearchGraphContext, ResearchStateType } from "../state";

const PLAN_SYSTEM_PROMPT = [
  "You are a research planner for a social-listening knowledge base.",
  "Given a research goal and its background, break it into a short plan of",
  "key sub-questions, then propose concrete evidence-gathering tasks to",
  "answer them. Search queries should be specific, in the language most",
  "likely used by the source content, and cover distinct angles (avoid",
  "near-duplicates).",
  "",
  buildTaskGuidance(),
].join("\n");

function buildPlanUserMessage(
  query: string,
  background: string,
  maxTasks: number,
): string {
  return [
    `Research goal:\n${query}`,
    background ? `\nBackground:\n${background}` : "",
    `\nProduce at most ${maxTasks} tasks.`,
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
      tasks: result.tasks.slice(0, ctx.maxSubQueries),
    };
  };
}
