import { z } from "zod";

import { EVALUATE_ALERTS_JOB_NAME } from "@/lib/alerts/config";
import { evaluateAlerts } from "@/lib/alerts/services/evaluate-alerts";
import { reportPeriodSchema } from "@/lib/metrics/schema";
import { GENERATE_DUE_REPORTS_JOB_NAME, GENERATE_REPORT_JOB_NAME } from "@/lib/reports/config";
import { enqueueDueReports } from "@/lib/reports/services/enqueue-due-reports";
import { generateReport } from "@/lib/reports/services/generate-report";

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
   * Hourly. Queues one `generate-report` job per project whose scheduled period just ended
   * without a report (D29). No payload required.
   */
  [GENERATE_DUE_REPORTS_JOB_NAME]: async () => enqueueDueReports(),
  /** One AI report: `{ projectId, period }`. Calls the model. */
  [GENERATE_REPORT_JOB_NAME]: async (payload) => {
    const { projectId, period } = z
      .object({ projectId: z.uuid(), period: reportPeriodSchema })
      .parse(payload);
    const report = await generateReport({ projectId, period, trigger: "schedule" });
    return { reportId: report.id, periodStart: report.periodStart, warnings: report.warnings.length };
  },
};
