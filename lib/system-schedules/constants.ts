import {
  BULK_DRAIN_JOB_NAME,
  RECOMPUTE_JOB_NAME,
} from "@/lib/topic-digests/constants";

export const SYSTEM_SCHEDULE_RUN_STATUS = {
  running: "running",
  success: "success",
  failed: "failed",
} as const;

export type SystemScheduleRunStatus =
  (typeof SYSTEM_SCHEDULE_RUN_STATUS)[keyof typeof SYSTEM_SCHEDULE_RUN_STATUS];

export const SYSTEM_SCHEDULE_RUN_TRIGGER = {
  scheduled: "scheduled",
  manual: "manual",
} as const;

export type SystemScheduleRunTrigger =
  (typeof SYSTEM_SCHEDULE_RUN_TRIGGER)[keyof typeof SYSTEM_SCHEDULE_RUN_TRIGGER];

export const DEFAULT_SYSTEM_SCHEDULES = [
  {
    scheduleId: "system-recompute-topic-digests",
    jobName: RECOMPUTE_JOB_NAME,
    cronConfig: { cron: "*/15 * * * *", timezone: "UTC" },
    description:
      "Recompute daily digest metrics for normal-stale topic rows every 15 min.",
  },
  {
    scheduleId: "system-bulk-drain-topic-digests",
    jobName: BULK_DRAIN_JOB_NAME,
    cronConfig: { cron: "*/15 * * * *", timezone: "UTC" },
    description:
      "Drain bulk-stale topic digest rows (taxonomy restructures) every 15 min.",
  },
] as const;

export const SYSTEM_SCHEDULE_JOB_NAMES = new Set<string>(
  DEFAULT_SYSTEM_SCHEDULES.map((schedule) => schedule.jobName),
);

export function isSystemScheduleJobName(jobName: string): boolean {
  return SYSTEM_SCHEDULE_JOB_NAMES.has(jobName);
}
