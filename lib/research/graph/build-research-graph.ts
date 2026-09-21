import { END, START, StateGraph } from "@langchain/langgraph";

import { createEvaluateNode, routeAfterEvaluate } from "./nodes/evaluate";
import { createPlanNode } from "./nodes/plan";
import { createSearchNode } from "./nodes/search";
import { createSynthesizeNode } from "./nodes/synthesize";
import { ResearchStateAnnotation, type ResearchGraphContext } from "./state";

/**
 * Builds the research graph: plan → search → evaluate, looping back to search
 * while gaps remain and the iteration budget allows, then synthesize.
 *
 * Node runtime config (workspace, web toggle, depth limits, synthesis model)
 * is closed over via `ctx`.
 */
export function buildResearchGraph(ctx: ResearchGraphContext) {
  return new StateGraph(ResearchStateAnnotation)
    .addNode("planner", createPlanNode(ctx))
    .addNode("search", createSearchNode(ctx))
    .addNode("evaluate", createEvaluateNode(ctx))
    .addNode("synthesize", createSynthesizeNode(ctx))
    .addEdge(START, "planner")
    .addEdge("planner", "search")
    .addEdge("search", "evaluate")
    .addConditionalEdges("evaluate", routeAfterEvaluate(ctx), {
      search: "search",
      synthesize: "synthesize",
    })
    .addEdge("synthesize", END)
    .compile();
}
