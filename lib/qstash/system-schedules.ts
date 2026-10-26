import { EVALUATE_ALERTS_JOB_NAME } from "@/lib/alerts/config";
import { GENERATE_DUE_REPORTS_JOB_NAME } from "@/lib/reports/config";

/**
 * QStash schedules that call `/api/qstash/callback` with a job of `job-config.ts`, kept in
 * QStash by `npm run schedules:jobs`. The id is the schedule id in QStash.
 */
export const SYSTEM_JOB_SCHEDULES = [
  {
    scheduleId: "system-evaluate-alerts",
    jobName: EVALUATE_ALERTS_JOB_NAME,
    cron: "CRON_TZ=Asia/Ho_Chi_Minh 5 * * * *",
  },
  {
    scheduleId: "system-generate-due-reports",
    jobName: GENERATE_DUE_REPORTS_JOB_NAME,
    cron: "CRON_TZ=Asia/Ho_Chi_Minh 10 * * * *",
  },
] as const;
