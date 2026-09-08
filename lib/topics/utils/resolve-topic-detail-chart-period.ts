import type { TopicDetailChartPeriodPreset } from "../topic-detail-chart-config";
import { resolveTopicCardPeriod } from "./resolve-topic-card-period";
import { addUtcDays, parseDateKey, toDateKey } from "./to-date-key";

export type ResolvedTopicDetailChartPeriod = {
  preset: TopicDetailChartPeriodPreset;
  startDate: string;
  endDate: string;
};

type ResolveTopicDetailChartPeriodParams = {
  preset: TopicDetailChartPeriodPreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
};

function utcToday(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

export function resolveTopicDetailChartPeriod(
  params: ResolveTopicDetailChartPeriodParams,
): ResolvedTopicDetailChartPeriod {
  const today = utcToday(params.now ?? new Date());

  switch (params.preset) {
    case "last_90_days":
      return {
        preset: params.preset,
        startDate: toDateKey(addUtcDays(today, -89)),
        endDate: toDateKey(today),
      };
    case "last_12_months":
      return {
        preset: params.preset,
        startDate: toDateKey(addUtcDays(today, -364)),
        endDate: toDateKey(today),
      };
    case "this_year":
      return {
        preset: params.preset,
        startDate: toDateKey(startOfUtcYear(today)),
        endDate: toDateKey(today),
      };
    case "last_year": {
      const year = today.getUTCFullYear() - 1;
      return {
        preset: params.preset,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }
    case "last_7_days":
    case "last_30_days":
    case "this_week":
    case "last_week":
    case "this_month":
    case "last_month":
    case "custom": {
      const period = resolveTopicCardPeriod({
        preset: params.preset,
        startDate: params.startDate,
        endDate: params.endDate,
        now: params.now,
      });

      return {
        preset: params.preset,
        startDate: period.startDate,
        endDate: period.endDate,
      };
    }
    default: {
      const exhaustive: never = params.preset;
      throw new Error(`Unsupported chart period preset: ${exhaustive}`);
    }
  }
}

export type TopicDetailChartBucket = "day" | "month";

export function resolveTopicDetailChartBucket(
  preset: TopicDetailChartPeriodPreset,
  startDate: string,
  endDate: string,
): TopicDetailChartBucket {
  if (
    preset === "this_year" ||
    preset === "last_year" ||
    preset === "last_12_months"
  ) {
    return "month";
  }

  if (preset === "custom") {
    const start = parseDateKey(startDate);
    const end = parseDateKey(endDate);
    const daySpan =
      Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    return daySpan > 90 ? "month" : "day";
  }

  return "day";
}
