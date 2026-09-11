import type { TermCardPeriodPreset } from "../term-card-config";
import { resolveTermCardPeriod } from "./resolve-term-card-period";

export type TermCardQuerySource = {
  source: "daily";
  startDate: string;
  endDate: string;
};

type ResolveTermCardQuerySourceParams = {
  preset: TermCardPeriodPreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
};

/**
 * All period presets are served from term_digest_daily via SUM aggregation.
 * Calendar presets (this_week, this_month, …) use the full calendar date range
 * so query results should be cached at the API layer.
 */
export function resolveTermCardQuerySource(
  params: ResolveTermCardQuerySourceParams,
): TermCardQuerySource {
  const period = resolveTermCardPeriod(params);

  return {
    source: "daily",
    startDate: period.startDate,
    endDate: period.endDate,
  };
}

/**
 * Returns sorted job UUIDs to filter by, or null when no filter should be applied
 * (i.e. the query aggregates across all jobs).
 */
export function resolveTermCardJobIds(jobIds?: string[]): string[] | null {
  if (!jobIds || jobIds.length === 0) {
    return null;
  }

  return [...jobIds].sort();
}
