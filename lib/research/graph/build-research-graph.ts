import { END, START, StateGraph } from "@langchain/langgraph";

import { createEvaluateNode, routeAfterEvaluate } from "./nodes/evaluate";
import { createGatherNode } from "./nodes/gather";
import { createPlanNode } from "./nodes/plan";
import { createSynthesizeNode } from "./nodes/synthesize";
import { ResearchStateAnnotation, type ResearchGraphContext } from "./state";

/**
 * Builds the research graph: plan → gather → evaluate, looping back to gather
 * while gaps remain and the iteration budget allows, then synthesize.
 *
 * `gather` dispatches typed tasks (search, term analytics, …) to their source
 * runners; see `lib/research/sources/run-research-task.ts`.
 *
 * Node runtime config (workspace, web toggle, depth limits, synthesis model)
 * is closed over via `ctx`.
 */
export function buildResearchGraph(ctx: ResearchGraphContext) {
  return new StateGraph(ResearchStateAnnotation)
    .addNode("planner", createPlanNode(ctx))
    .addNode("gather", createGatherNode(ctx))
    .addNode("evaluate", createEvaluateNode(ctx))
    .addNode("synthesize", createSynthesizeNode(ctx))
    .addEdge(START, "planner")
    .addEdge("planner", "gather")
    .addEdge("gather", "evaluate")
    .addConditionalEdges("evaluate", routeAfterEvaluate(ctx), {
      gather: "gather",
      synthesize: "synthesize",
    })
    .addEdge("synthesize", END)
    .compile();
}
