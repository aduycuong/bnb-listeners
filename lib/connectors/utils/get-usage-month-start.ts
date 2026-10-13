/** Start of the calendar month in UTC; monthly usage resets then. */
export function getUsageMonthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
