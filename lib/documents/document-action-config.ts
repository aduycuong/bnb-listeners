import type { SchedulableJobType } from "@/lib/jobs/constants";

export function getRefreshFromSourceActionLabel(
  jobType: string | null | undefined,
): string {
  switch (jobType) {
    case "scrape-facebook":
      return "Re-fetch Facebook post";
    case "scrape-website":
      return "Re-fetch from website";
    default:
      return "Refresh from source";
  }
}

export function canRefreshFromSource(jobType: string | null | undefined): boolean {
  return jobType === "scrape-facebook";
}

export function canUpdateComments(jobType: string | null | undefined): boolean {
  return jobType === "scrape-facebook";
}

export const DOCUMENT_ACTION_LABELS = {
  score: "Re-score quality",
  classify: "Re-classify topics",
  chunks: "Rebuild search index",
  updateComments: "Update comments",
} as const satisfies Record<string, string>;

export type DocumentActionKey =
  | keyof typeof DOCUMENT_ACTION_LABELS
  | "refresh";

export function isSchedulableJobTypeValue(
  value: string | null | undefined,
): value is SchedulableJobType {
  return value === "scrape-facebook" || value === "scrape-website";
}
