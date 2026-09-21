import { Annotation } from "@langchain/langgraph";

import type { ChatModelId } from "@/lib/langchain";

import type { Finding } from "../types";
import { mergeFindings } from "../utils/merge-findings";

/**
 * Shared state for the research graph. `findings` accumulates + dedupes
 * across iterations; `searchedQueries` tracks what has already been run so
 * the search node skips repeats.
 */
export const ResearchStateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  background: Annotation<string>(),
  plan: Annotation<string>(),
  subQueries: Annotation<string[]>(),
  searchedQueries: Annotation<string[]>({
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

/** Runtime configuration closed over by the graph nodes. */
export type ResearchGraphContext = {
  workspaceId: string;
  webEnabled: boolean;
  maxIterations: number;
  maxSubQueries: number;
  synthesizeModel: ChatModelId;
};
