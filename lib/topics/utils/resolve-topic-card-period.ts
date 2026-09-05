import type { TopicCardPeriodPreset } from "../topic-card-config";
import { addUtcDays, parseDateKey, toDateKey } from "./to-date-key";

export type ResolvedTopicCardPeriod = {
  preset: TopicCardPeriodPreset;
  startDate: string;
  endDate: string;
};

type ResolveTopicCardPeriodParams = {
  preset: TopicCardPeriodPreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
};

function utcToday(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfIsoWeek(date: Date): Date {
  const day = date.getUTCDay() || 7;
  return addUtcDays(date, -(day - 1));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date): Date {
  return addUtcDays(startOfUtcMonth(date), -1);
}

export function resolveTopicCardPeriod(
  params: ResolveTopicCardPeriodParams,
): ResolvedTopicCardPeriod {
  const today = utcToday(params.now ?? new Date());

  switch (params.preset) {
    case "this_week":
      return {
        preset: params.preset,
        startDate: toDateKey(startOfIsoWeek(today)),
        endDate: toDateKey(today),
      };
    case "last_week": {
      const thisWeekStart = startOfIsoWeek(today);
      const lastWeekStart = addUtcDays(thisWeekStart, -7);
      const lastWeekEnd = addUtcDays(thisWeekStart, -1);
      return {
        preset: params.preset,
        startDate: toDateKey(lastWeekStart),
        endDate: toDateKey(lastWeekEnd),
      };
    }
    case "this_month":
      return {
        preset: params.preset,
        startDate: toDateKey(startOfUtcMonth(today)),
        endDate: toDateKey(today),
      };
    case "last_month": {
      const lastMonthAnchor = addUtcDays(startOfUtcMonth(today), -1);
      return {
        preset: params.preset,
        startDate: toDateKey(startOfUtcMonth(lastMonthAnchor)),
        endDate: toDateKey(endOfUtcMonth(lastMonthAnchor)),
      };
    }
    case "last_7_days":
      return {
        preset: params.preset,
        startDate: toDateKey(addUtcDays(today, -6)),
        endDate: toDateKey(today),
      };
    case "last_30_days":
      return {
        preset: params.preset,
        startDate: toDateKey(addUtcDays(today, -29)),
        endDate: toDateKey(today),
      };
    case "custom": {
      if (!params.startDate || !params.endDate) {
        throw new Error("Custom period requires startDate and endDate.");
      }

      const start = parseDateKey(params.startDate);
      const end = parseDateKey(params.endDate);
      if (start.getTime() > end.getTime()) {
        throw new Error("startDate must be on or before endDate.");
      }

      return {
        preset: params.preset,
        startDate: params.startDate,
        endDate: params.endDate,
      };
    }
    default: {
      const exhaustive: never = params.preset;
      throw new Error(`Unsupported period preset: ${exhaustive}`);
    }
  }
}

export function buildSparklineDateKeys(
  endDate: string,
  days: number,
): string[] {
  const end = parseDateKey(endDate);
  const keys: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    keys.push(toDateKey(addUtcDays(end, -index)));
  }

  return keys;
}
