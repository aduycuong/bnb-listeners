import type { RouteFunction } from "@upstash/workflow";

import { dispatchDueRefreshes } from "../services/dispatch-due-refreshes";
import { dispatchDueSources } from "../services/dispatch-due-sources";
import { getSourceBudgets } from "../services/get-source-budgets";

/**
 * Started by a QStash schedule (`npm run schedules:sync`), every
 * `COLLECT_CONFIG.scheduler.intervalMinutes`.
 *
 * 1. budgets: monthly and daily usage of sources with a record limit.
 * 2. dispatch-sources: post runs for sources due by tier.
 * 3. dispatch-refreshes: `facebook-post-refresh` runs for due checkpoints,
 *    skipping sources out of budget.
 *
 * Each step starts `collect-source` workflows and returns a small summary.
 * A retried step does not double-start: sources with a pending run wait,
 * and dispatched checkpoints are leased. The payload is ignored.
 */
export const scheduleCollectionsWorkflow: RouteFunction<unknown> = async (
  context,
) => {
  const budgets = await context.run("budgets", () => getSourceBudgets());
  const exhausted = budgets
    .filter((budget) => budget.remaining <= 0)
    .map((budget) => budget.sourceId);

  const sources = await context.run("dispatch-sources", async () => {
    const decisions = await dispatchDueSources({ budgets });
    return {
      started: decisions.filter((decision) => decision.collectRunId).length,
      noBudget: decisions.filter((decision) => decision.status === "no-budget").length,
    };
  });

  const refreshes = await context.run("dispatch-refreshes", async () => {
    const result = await dispatchDueRefreshes({ excludeSourceIds: exhausted });
    return { due: result.due, runs: result.refreshRuns.length };
  });

  console.log("[workflow:schedule-collections] done", {
    workflowRunId: context.workflowRunId,
    sources,
    refreshes,
  });
};
