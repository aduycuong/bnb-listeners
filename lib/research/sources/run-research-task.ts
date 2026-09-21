import type { ResearchGraphContext } from "../graph/state";
import type { Finding, ResearchTask } from "../types";
import { searchSource } from "./search-source";
import { termAnalyticsSource } from "./term-analytics-source";

/**
 * Dispatches one research task to its source runner. The exhaustive switch is
 * the registry: adding a task kind to `researchTaskSchema` without a case here
 * is a compile error.
 */
export async function runResearchTask(
  task: ResearchTask,
  ctx: ResearchGraphContext,
): Promise<Finding[]> {
  switch (task.kind) {
    case "search":
      return searchSource.run(task, ctx);
    case "term_analytics":
      return termAnalyticsSource.run(task, ctx);
    default: {
      const exhaustive: never = task;
      throw new Error(`Unsupported research task: ${JSON.stringify(exhaustive)}`);
    }
  }
}
