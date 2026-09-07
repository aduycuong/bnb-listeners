import type { TopicCardPeriodPreset } from "../topic-card-config";
import { resolveTopicCardPeriod } from "./resolve-topic-card-period";

export type TopicCardQuerySource = {
  source: "daily";
  startDate: string;
  endDate: string;
};

type ResolveTopicCardQuerySourceParams = {
  preset: TopicCardPeriodPreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
};

/**
 * All period presets are served from topic_digest_daily via SUM aggregation.
 * Calendar presets (this_week, this_month, …) use the full calendar date range
 * so query results should be cached at the API layer.
 */
export function resolveTopicCardQuerySource(
  params: ResolveTopicCardQuerySourceParams,
): TopicCardQuerySource {
  const period = resolveTopicCardPeriod(params);

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
export function resolveTopicCardJobIds(jobIds?: string[]): string[] | null {
  if (!jobIds || jobIds.length === 0) {
    return null;
  }

  return [...jobIds].sort();
}
