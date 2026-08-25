export const RUN_SCHEDULED_JOB_QSTASH_JOB_NAME = "run-scheduled-job";

export type SchedulableJobType = "scrape-facebook" | "scrape-website";

export const SCHEDULABLE_JOB_TYPE_VALUES = [
  "scrape-facebook",
  "scrape-website",
] as const satisfies readonly SchedulableJobType[];

export function isSchedulableJobType(value: string): value is SchedulableJobType {
  return SCHEDULABLE_JOB_TYPE_VALUES.includes(value as SchedulableJobType);
}
