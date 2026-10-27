import { COLLECT_CONFIG } from "@/lib/connectors/config";
import { SYSTEM_JOB_SCHEDULES } from "@/lib/qstash/system-schedules";
import type { WorkflowName } from "@/lib/workflows/constants";

type ManagedScheduleBase = {
  /** Schedule id in QStash. */
  scheduleId: string;
  label: string;
  /** QStash cron, `CRON_TZ=…` allowed. */
  cron: string;
};

/** Starts a run of an Upstash Workflow. */
export type ManagedWorkflowSchedule = ManagedScheduleBase & {
  kind: "workflow";
  workflow: WorkflowName;
};

/** Calls `/api/qstash/callback` with a job of `lib/qstash/job-config.ts`. */
export type ManagedJobSchedule = ManagedScheduleBase & {
  kind: "job";
  jobName: string;
};

export type ManagedSchedule = ManagedWorkflowSchedule | ManagedJobSchedule;

const JOB_LABELS: Record<string, string> = {
  "system-evaluate-alerts": "Evaluate alerts",
  "system-generate-due-reports": "Generate due reports",
};

/**
 * QStash schedules the app owns, enabled and disabled in `/admin/scheduler`.
 * Crons stay in code; enabling a schedule creates it, or rewrites it when its
 * cron, destination or job differs from here, so it points at the server that
 * handled the click. Other schedules in the QStash account can only be paused
 * and resumed.
 */
export const MANAGED_SCHEDULES: readonly ManagedSchedule[] = [
  {
    kind: "workflow",
    scheduleId: "schedule-collections",
    label: "Schedule collections",
    workflow: "schedule-collections",
    cron: `*/${COLLECT_CONFIG.scheduler.intervalMinutes} * * * *`,
  },
  ...SYSTEM_JOB_SCHEDULES.map(
    (schedule): ManagedJobSchedule => ({
      kind: "job",
      scheduleId: schedule.scheduleId,
      label: JOB_LABELS[schedule.scheduleId] ?? schedule.scheduleId,
      jobName: schedule.jobName,
      cron: schedule.cron,
    }),
  ),
];

export function getManagedSchedule(scheduleId: string): ManagedSchedule | null {
  return MANAGED_SCHEDULES.find((schedule) => schedule.scheduleId === scheduleId) ?? null;
}
