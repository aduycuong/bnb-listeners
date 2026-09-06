import type { RollupGrain } from "@/lib/topic-digests/constants";
import { ALL_GROUPS_SENTINEL } from "@/lib/source-groups/constants";

import type { TopicCardPeriodPreset } from "../topic-card-config";
import { resolveTopicCardPeriod } from "./resolve-topic-card-period";

export type TopicCardQuerySource =
  | {
      source: "daily";
      startDate: string;
      endDate: string;
    }
  | {
      source: "rollup";
      grain: RollupGrain;
      periodStart: string;
    };

type ResolveTopicCardQuerySourceParams = {
  preset: TopicCardPeriodPreset;
  startDate?: string;
  endDate?: string;
  now?: Date;
};

const ROLLUP_PRESET_CONFIG: Partial<
  Record<TopicCardPeriodPreset, RollupGrain>
> = {
  this_week: "week",
  last_week: "week",
  this_month: "month",
  last_month: "month",
};

export function resolveTopicCardQuerySource(
  params: ResolveTopicCardQuerySourceParams,
): TopicCardQuerySource {
  const period = resolveTopicCardPeriod(params);
  const rollupGrain = ROLLUP_PRESET_CONFIG[params.preset];

  if (rollupGrain) {
    return {
      source: "rollup",
      grain: rollupGrain,
      periodStart: period.startDate,
    };
  }

  return {
    source: "daily",
    startDate: period.startDate,
    endDate: period.endDate,
  };
}

export function resolveTopicCardGroupId(groupId?: string): string {
  if (!groupId || groupId === ALL_GROUPS_SENTINEL) {
    return ALL_GROUPS_SENTINEL;
  }

  return groupId;
}
