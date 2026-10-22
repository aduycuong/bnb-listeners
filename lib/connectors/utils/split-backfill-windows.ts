const DAY_MS = 24 * 60 * 60 * 1000;

export type BackfillWindow = { since: Date; until: Date };

/**
 * Splits `[from, to]` into windows of at most `windowDays`, newest first. The
 * newest window is full-length and the oldest takes the remainder, so every
 * window but the last one is a whole number of days.
 */
export function splitBackfillWindows(
  from: Date,
  to: Date,
  windowDays: number,
): BackfillWindow[] {
  const step = windowDays * DAY_MS;
  const windows: BackfillWindow[] = [];

  for (let until = to.getTime(); until > from.getTime(); until -= step) {
    windows.push({
      since: new Date(Math.max(from.getTime(), until - step)),
      until: new Date(until),
    });
  }

  return windows;
}
