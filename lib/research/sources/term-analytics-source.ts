import { findTopTerms } from "@/lib/terms/services/find-top-terms";
import { getTermAnalytics } from "@/lib/terms/services/get-term-analytics";
import { TERM_CARD_PERIOD_LABELS } from "@/lib/terms/term-card-config";
import { resolveTermCardPeriod } from "@/lib/terms/utils/resolve-term-card-period";

import { RESEARCH_ANALYTICS_MAX_TERMS } from "../config";
import type { Finding } from "../types";
import { formatTermAnalyticsFinding } from "../utils/format-term-analytics-finding";
import type { ResearchSourceRunner } from "./types";

/**
 * `term_analytics` task: resolves the query to tracked terms (keyword or term
 * group via `findTopTerms`), pulls their daily digests for the period, and
 * emits a single table-style finding. Best-effort — analytics never aborts a
 * run.
 */
export const termAnalyticsSource: ResearchSourceRunner<"term_analytics"> = {
  kind: "term_analytics",
  async run(task, ctx) {
    try {
      const period = resolveTermCardPeriod({ preset: task.period });
      const topTerms = await findTopTerms(
        { query: task.query, period },
        ctx.workspaceContext,
      );

      const items = topTerms.items.slice(0, RESEARCH_ANALYTICS_MAX_TERMS);
      if (items.length === 0) return [];

      const analytics = await getTermAnalytics(
        { termIds: items.map((item) => item.id), period },
        ctx.workspaceContext,
      );
      const analyticsByTermId = new Map(
        analytics.terms.map((term) => [term.id, term]),
      );

      const scope = task.query.trim() || "all terms";
      const finding: Finding = {
        kind: "analytics",
        ref: `analytics:top-terms:${task.period}:${scope.toLowerCase()}`,
        title: `Term analytics: ${scope} (${TERM_CARD_PERIOD_LABELS[task.period]})`,
        content: formatTermAnalyticsFinding({
          query: task.query,
          topTerms: { ...topTerms, items },
          analyticsByTermId,
        }),
        publishedAt: null,
      };

      return [finding];
    } catch (error) {
      console.warn("[research] term analytics failed", error);
      return [];
    }
  },
};
