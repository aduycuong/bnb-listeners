import type { ResearchTask } from "../types";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Stable, human-readable dedupe key for a research task. Two tasks with the
 * same key are considered the same unit of work and are only run once per run.
 */
export function buildTaskKey(task: ResearchTask): string {
  switch (task.kind) {
    case "search":
      return `search:${normalizeQuery(task.query)}`;
    case "term_analytics":
      return [
        "term_analytics",
        task.period,
        normalizeQuery(task.query) || "*",
        normalizeQuery(task.selectionCriteria.include),
        normalizeQuery(task.selectionCriteria.exclude),
      ].join(":");
    default: {
      const exhaustive: never = task;
      throw new Error(`Unsupported research task: ${JSON.stringify(exhaustive)}`);
    }
  }
}
