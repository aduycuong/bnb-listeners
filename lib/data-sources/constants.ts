export const RUN_SCHEDULED_DATA_SOURCE_QSTASH_JOB_NAME = "run-scheduled-job";

export type SourceType = "scrape-facebook" | "scrape-website";

export const SOURCE_TYPE_VALUES = [
  "scrape-facebook",
  "scrape-website",
] as const satisfies readonly SourceType[];

export function isSourceType(value: string): value is SourceType {
  return SOURCE_TYPE_VALUES.includes(value as SourceType);
}
