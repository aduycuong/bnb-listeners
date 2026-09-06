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
import { ALL_SOURCE_GROUPS_LABEL } from "@/lib/source-groups/source-group-filter-config";
import type { SourceGroupListItem } from "@/lib/source-groups/types";
import {
  TOPIC_CARD_PERIOD_LABELS,
  TOPIC_CARD_PERIOD_PRESETS,
  TOPIC_CARD_SORT_LABELS,
  TOPIC_CARD_SORT_OPTIONS,
  type TopicCardPeriodPreset,
  type TopicCardSort,
} from "@/lib/topics/topic-card-config";
import { cn } from "@/lib/utils";

type TopicListToolbarProps = {
  period: TopicCardPeriodPreset;
  sort: TopicCardSort;
  groupIds: string[];
  sourceGroups: SourceGroupListItem[];
  customStartDate?: string;
  customEndDate?: string;
  onPeriodChange: (period: TopicCardPeriodPreset) => void;
  onSortChange: (sort: TopicCardSort) => void;
  onGroupIdsChange: (groupIds: string[]) => void;
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

function isAllSourcesSelected(groupIds: string[]) {
  return groupIds.length === 0;
}

function isGroupSelected(groupIds: string[], groupId: string) {
  return isAllSourcesSelected(groupIds) || groupIds.includes(groupId);
}

function toggleSourceGroup(
  selectedIds: string[],
  groupId: string,
  allGroupIds: string[],
) {
  if (isAllSourcesSelected(selectedIds)) {
    return [groupId];
  }

  const isSelected = selectedIds.includes(groupId);
  if (isSelected) {
    const next = selectedIds.filter((id) => id !== groupId);
    return next.length === 0 ? [] : next;
  }

  const next = [...selectedIds, groupId];
  if (
    allGroupIds.length > 0 &&
    allGroupIds.every((id) => next.includes(id))
  ) {
    return [];
  }

  return next;
}

const unselectedSourceTagClassName =
  "border-emerald-200 text-foreground hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-emerald-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30";

const selectedSourceTagClassName =
  "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:border-emerald-700 hover:bg-emerald-700 hover:text-white dark:border-emerald-600 dark:bg-emerald-600 dark:hover:border-emerald-500 dark:hover:bg-emerald-500";

export function TopicListToolbar({
  period,
  sort,
  groupIds,
  sourceGroups,
  customStartDate,
  customEndDate,
  onPeriodChange,
  onSortChange,
  onGroupIdsChange,
  onCustomRangeApply,
  disabled = false,
}: TopicListToolbarProps) {
  const periodLabel = getPeriodLabel(period, customStartDate, customEndDate);
  const sortLabel = TOPIC_CARD_SORT_LABELS[sort];
  const allGroupIds = sourceGroups.map((group) => group.id);
  const allSourcesSelected = isAllSourcesSelected(groupIds);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <DropdownMenuContent align="end" className="min-w-44">
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

        {sourceGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "rounded-full",
                allSourcesSelected
                  ? selectedSourceTagClassName
                  : unselectedSourceTagClassName,
              )}
              disabled={disabled}
              onClick={() => onGroupIdsChange([])}
            >
              {ALL_SOURCE_GROUPS_LABEL}
            </Button>

            {sourceGroups.map((group) => {
              const selected = isGroupSelected(groupIds, group.id);

              return (
                <Button
                  key={group.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    selected
                      ? selectedSourceTagClassName
                      : unselectedSourceTagClassName,
                  )}
                  disabled={disabled}
                  onClick={() =>
                    onGroupIdsChange(
                      toggleSourceGroup(groupIds, group.id, allGroupIds),
                    )
                  }
                >
                  {group.name}
                </Button>
              );
            })}
          </div>
        ) : null}
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
