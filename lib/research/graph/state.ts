import { Annotation } from "@langchain/langgraph";

import type { ChatModelId } from "@/lib/langchain";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { Finding, ResearchTask } from "../types";
import { mergeFindings } from "../utils/merge-findings";

/**
 * Shared state for the research graph. `findings` accumulates + dedupes
 * across iterations; `completedTaskKeys` tracks which tasks have already run
 * so the gather node skips repeats.
 */
export const ResearchStateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  background: Annotation<string>(),
  plan: Annotation<string>(),
  /** Tasks pending for the next gather step (replaced each iteration). */
  tasks: Annotation<ResearchTask[]>(),
  completedTaskKeys: Annotation<string[]>({
    reducer: (existing, incoming) =>
      Array.from(new Set([...existing, ...incoming])),
    default: () => [],
  }),
  findings: Annotation<Finding[]>({
    reducer: mergeFindings,
    default: () => [],
  }),
  iteration: Annotation<number>(),
  sufficient: Annotation<boolean>(),
  gaps: Annotation<string[]>(),
  report: Annotation<string>(),
});

export type ResearchStateType = typeof ResearchStateAnnotation.State;

/** Runtime configuration closed over by the graph nodes and source runners. */
export type ResearchGraphContext = {
  /** Tenant scope for every data source; `workspaceId` is always taken from here. */
  workspaceContext: WorkspaceContext;
  webEnabled: boolean;
  maxIterations: number;
  /** Max tasks (of any kind) planned per iteration. */
  maxSubQueries: number;
  synthesizeModel: ChatModelId;
};
