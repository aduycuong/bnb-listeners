import type { TermDetailChartPeriodPreset } from "../term-detail-chart-config";
import { resolveTermCardPeriod } from "./resolve-term-card-period";
import { addUtcDays, parseDateKey, toDateKey } from "./to-date-key";

export type ResolvedTermDetailChartPeriod = {
  preset: TermDetailChartPeriodPreset;
  startDate: string;
  endDate: string;
};

type ResolveTermDetailChartPeriodParams = {
  preset: TermDetailChartPeriodPreset;
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

export function resolveTermDetailChartPeriod(
  params: ResolveTermDetailChartPeriodParams,
): ResolvedTermDetailChartPeriod {
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
      const period = resolveTermCardPeriod({
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

export type TermDetailChartBucket = "day" | "month";

export function resolveTermDetailChartBucket(
  preset: TermDetailChartPeriodPreset,
  startDate: string,
  endDate: string,
): TermDetailChartBucket {
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
