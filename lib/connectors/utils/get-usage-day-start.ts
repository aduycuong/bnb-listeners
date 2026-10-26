const DAY_MS = 24 * 60 * 60 * 1000;
/** Asia/Ho_Chi_Minh is UTC+7 all year (no daylight saving). */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Start of the day in Vietnam time; daily usage resets then (17:00 UTC). */
export function getUsageDayStart(now: Date): Date {
  const local = now.getTime() + VIETNAM_OFFSET_MS;
  return new Date(local - (local % DAY_MS) - VIETNAM_OFFSET_MS);
}
