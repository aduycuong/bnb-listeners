import { InvalidInputError } from "@/lib/common/service-errors";

import { METRICS_CONFIG, REPORT_PERIOD_TYPES } from "../config";
import type { ReportPeriod, ReportPeriodInfo } from "../types";

/** Days of a period as in `ReportPeriodInfo`, but `end` and `previousEnd` are exclusive. */
export type PeriodDates = ReportPeriodInfo;

/** Calendar dates as `YYYY-MM-DD`; arithmetic runs on UTC midnights, so no timezone shifts. */
function toDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number) {
  const date = toDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date);
}

function daysBetween(start: string, end: string) {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000);
}

function minKey(a: string, b: string) {
  return a < b ? a : b;
}

/** First day of the calendar period holding `dateKey`, and the first day after it. */
function calendarBounds(type: (typeof REPORT_PERIOD_TYPES)[number], dateKey: string) {
  const date = toDate(dateKey);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (type === "day") return { start: dateKey, next: addDays(dateKey, 1) };
  if (type === "week") {
    const start = addDays(dateKey, -((date.getUTCDay() + 6) % 7));
    return { start, next: addDays(start, 7) };
  }
  if (type === "month") {
    return { start: toKey(new Date(Date.UTC(year, month, 1))), next: toKey(new Date(Date.UTC(year, month + 1, 1))) };
  }
  if (type === "quarter") {
    const first = month - (month % 3);
    return { start: toKey(new Date(Date.UTC(year, first, 1))), next: toKey(new Date(Date.UTC(year, first + 3, 1))) };
  }
  return { start: toKey(new Date(Date.UTC(year, 0, 1))), next: toKey(new Date(Date.UTC(year + 1, 0, 1))) };
}

/**
 * The days of a report period and of the period it is compared against, given today in the
 * project's timezone (D28). Ends are exclusive here: `end` is the first day after the period.
 * A period never runs past today. A running calendar period is compared with the same number
 * of days at the start of the period before (month to date against last month to date).
 */
export function resolvePeriodDates(
  period: ReportPeriod,
  today: string,
): PeriodDates {
  const tomorrow = addDays(today, 1);

  if (period.type === "rolling") {
    const start = addDays(today, -(period.days - 1));
    return {
      type: "rolling",
      start,
      end: tomorrow,
      days: period.days,
      previousStart: addDays(start, -period.days),
      previousEnd: start,
      complete: false,
    };
  }

  if (period.type === "custom") {
    if (period.from > period.to) {
      throw new InvalidInputError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
    }
    if (period.from > today) throw new InvalidInputError("Kỳ báo cáo chưa bắt đầu.");
    const end = minKey(addDays(period.to, 1), tomorrow);
    const days = daysBetween(period.from, end);
    if (days > METRICS_CONFIG.maxPeriodDays) {
      throw new InvalidInputError(`Kỳ báo cáo dài tối đa ${METRICS_CONFIG.maxPeriodDays} ngày.`);
    }
    return {
      type: "custom",
      start: period.from,
      end,
      days,
      previousStart: addDays(period.from, -days),
      previousEnd: period.from,
      complete: end <= today,
    };
  }

  const { start, next } = calendarBounds(period.type, period.date ?? today);
  if (start > today) throw new InvalidInputError("Kỳ báo cáo chưa bắt đầu.");
  const end = minKey(next, tomorrow);
  const complete = end === next && next <= today;
  const previous = calendarBounds(period.type, addDays(start, -1));
  return {
    type: period.type,
    start,
    end,
    days: daysBetween(start, end),
    previousStart: previous.start,
    previousEnd: complete ? start : minKey(addDays(previous.start, daysBetween(start, end)), start),
    complete,
  };
}
