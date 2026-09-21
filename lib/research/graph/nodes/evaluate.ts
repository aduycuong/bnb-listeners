import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { RESEARCH_FAST_MODEL } from "../../config";
import { researchEvaluationSchema } from "../../schema";
import { buildTaskGuidance } from "../../utils/build-task-guidance";
import { buildTaskKey } from "../../utils/build-task-key";
import { formatFindings } from "../../utils/format-findings";
import type { ResearchGraphContext, ResearchStateType } from "../state";

const EVALUATE_SYSTEM_PROMPT = [
  "You are a research critic. Given the research goal, plan, and the evidence",
  "gathered so far, judge whether coverage is sufficient to write a solid",
  "answer. If not, list the concrete gaps and propose new, non-duplicate tasks",
  "that would close them. Be strict but efficient: do not request more work",
  "once the evidence reasonably answers the goal.",
  "",
  buildTaskGuidance(),
].join("\n");

function buildEvaluateUserMessage(
  state: ResearchStateType,
  context: string,
  maxTasks: number,
): string {
  return [
    `Research goal:\n${state.query}`,
    state.background ? `\nBackground:\n${state.background}` : "",
    `\nPlan:\n${state.plan}`,
    `\nAlready completed tasks (kind:…):\n${state.completedTaskKeys.join("\n") || "(none)"}`,
    `\nEvidence gathered (${state.findings.length} items):\n${context || "(none)"}`,
    `\nPropose at most ${maxTasks} new tasks if gaps remain.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function createEvaluateNode(ctx: ResearchGraphContext) {
  return async (
    state: ResearchStateType,
  ): Promise<Partial<ResearchStateType>> => {
    const nextIteration = state.iteration + 1;

    // At the iteration ceiling there is no point spending an LLM call to plan
    // more tasks — force synthesis.
    if (nextIteration >= ctx.maxIterations) {
      return { iteration: nextIteration, sufficient: true, gaps: [] };
    }

    const model = createChatModel(RESEARCH_FAST_MODEL, { temperature: 0 });
    const structured = model.withStructuredOutput(researchEvaluationSchema);
    const { context } = formatFindings(state.findings);

    const result = await structured.invoke([
      new SystemMessage(EVALUATE_SYSTEM_PROMPT),
      new HumanMessage(
        buildEvaluateUserMessage(state, context, ctx.maxSubQueries),
      ),
    ]);

    const completed = new Set(state.completedTaskKeys);
    const newTasks = result.newTasks
      .filter((task) => !completed.has(buildTaskKey(task)))
      .slice(0, ctx.maxSubQueries);

    return {
      iteration: nextIteration,
      sufficient: result.sufficient,
      gaps: result.gaps,
      tasks: newTasks,
    };
  };
}

/** Conditional edge: loop back to gather, or move on to synthesis. */
export function routeAfterEvaluate(
  ctx: ResearchGraphContext,
): (state: ResearchStateType) => "gather" | "synthesize" {
  return (state) => {
    if (state.sufficient) return "synthesize";
    if (state.iteration >= ctx.maxIterations) return "synthesize";
    if (state.tasks.length === 0) return "synthesize";
    return "gather";
  };
}
