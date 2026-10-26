import type { REPORT_PERIOD_TYPES } from "@/lib/metrics/config";
import { addDays, resolvePeriodDates } from "@/lib/metrics/utils/resolve-period-dates";

/**
 * First day of the last calendar period of `type` that has ended by `today` (D29): yesterday
 * for `day`, last week on any day of this week, and so on.
 */
export function lastClosedPeriodStart(
  type: (typeof REPORT_PERIOD_TYPES)[number],
  today: string,
): string {
  const running = resolvePeriodDates({ type, date: today }, today);
  return resolvePeriodDates({ type, date: addDays(running.start, -1) }, today).start;
}
