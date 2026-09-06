"use client";

import { ChevronDownIcon } from "lucide-react";

import { TopicCustomPeriodDialog } from "@/components/topics/topic-custom-period-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALL_SOURCE_GROUPS_LABEL,
  ALL_SOURCE_GROUPS_VALUE,
} from "@/lib/source-groups/source-group-filter-config";
import type { SourceGroupListItem } from "@/lib/source-groups/types";
import {
  TOPIC_CARD_PERIOD_LABELS,
  TOPIC_CARD_PERIOD_PRESETS,
  TOPIC_CARD_SORT_LABELS,
  TOPIC_CARD_SORT_OPTIONS,
  type TopicCardPeriodPreset,
  type TopicCardSort,
} from "@/lib/topics/topic-card-config";

type TopicListToolbarProps = {
  period: TopicCardPeriodPreset;
  sort: TopicCardSort;
  groupId: string;
  sourceGroups: SourceGroupListItem[];
  customStartDate?: string;
  customEndDate?: string;
  onPeriodChange: (period: TopicCardPeriodPreset) => void;
  onSortChange: (sort: TopicCardSort) => void;
  onGroupChange: (groupId: string) => void;
  onCustomRangeApply: (range: { startDate: string; endDate: string }) => void;
  disabled?: boolean;
};

function getPeriodLabel(
  period: TopicCardPeriodPreset,
  customStartDate?: string,
  customEndDate?: string,
) {
  if (period === "custom" && customStartDate && customEndDate) {
    return `${customStartDate} – ${customEndDate}`;
  }

  return TOPIC_CARD_PERIOD_LABELS[period];
}

function getGroupLabel(
  groupId: string,
  sourceGroups: SourceGroupListItem[],
) {
  if (groupId === ALL_SOURCE_GROUPS_VALUE) {
    return ALL_SOURCE_GROUPS_LABEL;
  }

  return sourceGroups.find((group) => group.id === groupId)?.name ?? "Source group";
}

export function TopicListToolbar({
  period,
  sort,
  groupId,
  sourceGroups,
  customStartDate,
  customEndDate,
  onPeriodChange,
  onSortChange,
  onGroupChange,
  onCustomRangeApply,
  disabled = false,
}: TopicListToolbarProps) {
  const periodLabel = getPeriodLabel(period, customStartDate, customEndDate);
  const sortLabel = TOPIC_CARD_SORT_LABELS[sort];
  const groupLabel = getGroupLabel(groupId, sourceGroups);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-auto sm:min-w-44"
                disabled={disabled}
              />
            }
          >
            {groupLabel}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuRadioGroup value={groupId} onValueChange={onGroupChange}>
              <DropdownMenuRadioItem value={ALL_SOURCE_GROUPS_VALUE}>
                {ALL_SOURCE_GROUPS_LABEL}
              </DropdownMenuRadioItem>
              {sourceGroups.map((group) => (
                <DropdownMenuRadioItem key={group.id} value={group.id}>
                  {group.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-auto sm:min-w-44"
                disabled={disabled}
              />
            }
          >
            {periodLabel}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuRadioGroup
              value={period}
              onValueChange={(value) =>
                onPeriodChange(value as TopicCardPeriodPreset)
              }
            >
              {TOPIC_CARD_PERIOD_PRESETS.filter(
                (option) => option !== "custom",
              ).map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {TOPIC_CARD_PERIOD_LABELS[option]}
                </DropdownMenuRadioItem>
              ))}
              <DropdownMenuRadioItem value="custom">
                {TOPIC_CARD_PERIOD_LABELS.custom}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-auto sm:min-w-44"
                disabled={disabled}
              />
            }
          >
            Sort: {sortLabel}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onSortChange(value as TopicCardSort)}
            >
              {TOPIC_CARD_SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {TOPIC_CARD_SORT_LABELS[option]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TopicCustomPeriodDialog
        open={period === "custom"}
        onOpenChange={(open) => {
          if (!open && period === "custom" && !customStartDate) {
            onPeriodChange("last_7_days");
          }
        }}
        startDate={customStartDate}
        endDate={customEndDate}
        onApply={onCustomRangeApply}
      />
    </>
  );
}
