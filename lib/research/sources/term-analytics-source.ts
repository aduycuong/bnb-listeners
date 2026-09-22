import { findRelevantTopTerms } from "@/lib/terms/services/find-relevant-top-terms";
import { getTermAnalytics } from "@/lib/terms/services/get-term-analytics";
import { TERM_CARD_PERIOD_LABELS } from "@/lib/terms/term-card-config";
import { resolveTermCardPeriod } from "@/lib/terms/utils/resolve-term-card-period";

import { RESEARCH_ANALYTICS_MAX_TERMS } from "../config";
import type { Finding } from "../types";
import { formatTermAnalyticsFinding } from "../utils/format-term-analytics-finding";
import type { ResearchSourceRunner } from "./types";

/**
 * `term_analytics` task: scans the period's active terms in trend order and
 * lets an LLM agent (with Exa lookup for ambiguous names) apply the task's
 * term-selection criteria via `findRelevantTopTerms`, pulls their daily digests
 * for the period, and emits a single table-style finding. Best-effort —
 * analytics never aborts a run.
 */
export const termAnalyticsSource: ResearchSourceRunner<"term_analytics"> = {
  kind: "term_analytics",
  async run(task, ctx) {
    try {
      const period = resolveTermCardPeriod({ preset: task.period });
      const topTerms = await findRelevantTopTerms(
        {
          query: task.query,
          selectionCriteria: task.selectionCriteria,
          period,
          limit: RESEARCH_ANALYTICS_MAX_TERMS,
        },
        ctx.workspaceContext,
      );

      if (topTerms.items.length === 0) return [];

      const analytics = await getTermAnalytics(
        { termIds: topTerms.items.map((item) => item.id), period },
        ctx.workspaceContext,
      );
      const analyticsByTermId = new Map(
        analytics.terms.map((term) => [term.id, term]),
      );

      const scope = topTerms.query || "all terms";
      const criteriaKey = [
        task.selectionCriteria.include,
        task.selectionCriteria.exclude,
      ]
        .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
        .join(":");
      const finding: Finding = {
        kind: "analytics",
        ref: `analytics:top-terms:${task.period}:${scope.toLowerCase()}:${criteriaKey}`,
        title: `Term analytics: ${scope} (${TERM_CARD_PERIOD_LABELS[task.period]})`,
        content: formatTermAnalyticsFinding({ topTerms, analyticsByTermId }),
        publishedAt: null,
      };

      return [finding];
    } catch (error) {
      console.warn("[research] term analytics failed", error);
      return [];
    }
  },
};
