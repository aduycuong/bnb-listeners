import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { createChatModel } from "@/lib/langchain";

import { RESEARCH_FAST_MODEL } from "../../config";
import { researchEvaluationSchema } from "../../schema";
import { formatFindings } from "../../utils/format-findings";
import type { ResearchGraphContext, ResearchStateType } from "../state";

const EVALUATE_SYSTEM_PROMPT = [
  "You are a research critic. Given the research goal, plan, and the evidence",
  "gathered so far, judge whether coverage is sufficient to write a solid",
  "answer. If not, list the concrete gaps and propose new, non-duplicate search",
  "queries that would close them. Be strict but efficient: do not request more",
  "searches once the evidence reasonably answers the goal.",
].join(" ");

function buildEvaluateUserMessage(
  state: ResearchStateType,
  context: string,
  maxSubQueries: number,
): string {
  return [
    `Research goal:\n${state.query}`,
    state.background ? `\nBackground:\n${state.background}` : "",
    `\nPlan:\n${state.plan}`,
    `\nAlready searched queries:\n${state.searchedQueries.join("\n") || "(none)"}`,
    `\nEvidence gathered (${state.findings.length} items):\n${context || "(none)"}`,
    `\nPropose at most ${maxSubQueries} new queries if gaps remain.`,
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
    // more searches — force synthesis.
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

    const newQueries = result.newQueries
      .filter((query) => !state.searchedQueries.includes(query))
      .slice(0, ctx.maxSubQueries);

    return {
      iteration: nextIteration,
      sufficient: result.sufficient,
      gaps: result.gaps,
      subQueries: newQueries,
    };
  };
}

/** Conditional edge: loop back to search, or move on to synthesis. */
export function routeAfterEvaluate(
  ctx: ResearchGraphContext,
): (state: ResearchStateType) => "search" | "synthesize" {
  return (state) => {
    if (state.sufficient) return "synthesize";
    if (state.iteration >= ctx.maxIterations) return "synthesize";
    if (state.subQueries.length === 0) return "synthesize";
    return "search";
  };
}
