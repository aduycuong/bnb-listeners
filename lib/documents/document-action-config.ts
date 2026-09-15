import type { SourceType } from "@/lib/data-sources/constants";

export function getRefreshFromSourceActionLabel(
  sourceType: string | null | undefined,
): string {
  switch (sourceType) {
    case "scrape-facebook":
      return "Re-fetch Facebook post";
    case "scrape-website":
      return "Re-fetch from website";
    default:
      return "Refresh from source";
  }
}

export function canRefreshFromSource(sourceType: string | null | undefined): boolean {
  return sourceType === "scrape-facebook";
}

export function canUpdateComments(sourceType: string | null | undefined): boolean {
  return sourceType === "scrape-facebook";
}

export const DOCUMENT_ACTION_LABELS = {
  score: "Re-score quality",
  classify: "Re-classify terms",
  chunks: "Rebuild search index",
  updateComments: "Update comments",
} as const satisfies Record<string, string>;

export type DocumentActionKey =
  | keyof typeof DOCUMENT_ACTION_LABELS
  | "refresh";

export function isSourceTypeValue(
  value: string | null | undefined,
): value is SourceType {
  return value === "scrape-facebook" || value === "scrape-website";
}
