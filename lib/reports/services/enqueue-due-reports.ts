import { addJob } from "@/lib/qstash/services/add-job-service";

import { GENERATE_REPORT_JOB_NAME, REPORT_JOB_PARALLELISM } from "../config";
import { findDueReports } from "./find-due-reports";

/**
 * Hourly job (D29): one QStash job per due report, so each model call runs in its own request
 * and a failure is retried alone. Flow control keeps a few calls running at once.
 */
export async function enqueueDueReports(): Promise<{ due: number }> {
  const due = await findDueReports();
  for (const item of due) {
    await addJob({
      jobName: GENERATE_REPORT_JOB_NAME,
      payload: {
        projectId: item.projectId,
        period: { type: item.periodType, date: item.periodStart },
      },
      userId: "system",
      flowControl: { key: GENERATE_REPORT_JOB_NAME, parallelism: REPORT_JOB_PARALLELISM },
    });
  }
  return { due: due.length };
}
