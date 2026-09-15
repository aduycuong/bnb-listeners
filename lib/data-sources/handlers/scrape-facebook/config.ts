export const SCRAPE_FACEBOOK_DOCUMENT_COMMENTS_JOB_NAME =
  "scrape-facebook-document-comments";

export const DEFAULT_SCRAPE_POST_COMMENTS = true;
export const DEFAULT_MAX_COMMENTS = 100;
export const FACEBOOK_COMMENT_SCRAPE_MAX_ATTEMPTS = 10;

export const FACEBOOK_COMMENT_SCRAPE_DELAYS_SECONDS = {
  first: 15 * 60,
  afterNewComments: 30 * 60,
  afterNoNewComments: 60 * 60,
} as const;

export function readScrapePostComments(
  params: Record<string, unknown> | null | undefined,
): boolean {
  if (params?.scrapePostComments === false) {
    return false;
  }

  return DEFAULT_SCRAPE_POST_COMMENTS;
}

export function readMaxComments(
  params: Record<string, unknown> | null | undefined,
): number {
  const value = params?.maxComments;

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return DEFAULT_MAX_COMMENTS;
}

export function readCommentScrapeAttempt(
  result: Record<string, unknown> | null | undefined,
): number | null {
  const value = result?.attempt;

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return null;
}
