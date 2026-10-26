import { EVALUATE_ALERTS_JOB_NAME } from "@/lib/alerts/config";
import { evaluateAlerts } from "@/lib/alerts/services/evaluate-alerts";
import { REFRESH_METRICS_DAILY_JOB_NAME } from "@/lib/metrics/config";
import { refreshRecentMetricsDaily } from "@/lib/metrics/services/refresh-recent-metrics-daily";

export type QstashJobHandlerContext = {
  userId?: string;
};

export type QstashJobHandler = (
  payload: unknown,
  context: QstashJobHandlerContext,
) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;

/**
 * Registry of QStash job handlers keyed by job name.
 *
 * Add new jobs here, e.g.:
 * "my-job-name": async (payload, ctx) => { ... }
 */
export const qstashJobHandlers: Record<string, QstashJobHandler> = {
  /**
   * Hourly. Evaluates enabled alert rules and sends email.
   * No payload required.
   */
  [EVALUATE_ALERTS_JOB_NAME]: async () => {
    const result = await evaluateAlerts({ dryRun: false });
    return {
      projects: result.projects,
      created: result.created,
      emailed: result.emailed,
      emailFailed: result.emailFailed,
    };
  },
  /**
   * Nightly. Rewrites the last days of the L4 daily metrics of every project (D28).
   * No payload required.
   */
  [REFRESH_METRICS_DAILY_JOB_NAME]: async () => refreshRecentMetricsDaily(),
};
