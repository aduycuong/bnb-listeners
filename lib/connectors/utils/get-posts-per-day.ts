const DAY_MS = 24 * 60 * 60 * 1000;

type GetPostsPerDayParams = {
  /** Posts published in the window. */
  posts: number;
  /** Oldest of those posts; null when there are none. */
  oldestPublishedAt: Date | null;
  windowDays: number;
  now: Date;
};

/**
 * Posts per day over the window, rounded to one decimal. A source with less
 * history than the window is measured over what it has (at least one day),
 * so a new busy source is not averaged down.
 */
export function getPostsPerDay(params: GetPostsPerDayParams): number {
  const spanDays = params.oldestPublishedAt
    ? Math.min(
        params.windowDays,
        Math.max(1, (params.now.getTime() - params.oldestPublishedAt.getTime()) / DAY_MS),
      )
    : params.windowDays;

  return Math.round((params.posts / spanDays) * 10) / 10;
}
