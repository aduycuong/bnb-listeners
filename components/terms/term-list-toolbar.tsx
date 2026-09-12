"use client";

import { ChevronDownIcon, SearchIcon } from "lucide-react";

import { TermCustomPeriodDialog } from "@/components/terms/term-custom-period-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JobListItem } from "@/lib/jobs/types";
import type { TermGroupListItem } from "@/lib/term-groups/types";
import {
  TERM_CARD_PERIOD_LABELS,
  TERM_CARD_PERIOD_PRESETS,
  TERM_CARD_SORT_LABELS,
  TERM_CARD_SORT_OPTIONS,
  type TermCardPeriodPreset,
  type TermCardSort,
} from "@/lib/terms/term-card-config";
import { TERM_CONFIG } from "@/lib/terms/term-config";
import { cn } from "@/lib/utils";

const ALL_JOBS_LABEL = "All jobs";
const ALL_GROUPS_LABEL = "All groups";

type TermListToolbarProps = {
  period: TermCardPeriodPreset;
  sort: TermCardSort;
  jobIds: string[];
  jobs: JobListItem[];
  groups: TermGroupListItem[];
  search: string;
  groupId?: string;
  customStartDate?: string;
  customEndDate?: string;
  onPeriodChange: (period: TermCardPeriodPreset) => void;
  onSortChange: (sort: TermCardSort) => void;
  onJobIdsChange: (jobIds: string[]) => void;
  onSearchChange: (search: string) => void;
  onGroupIdChange: (groupId: string | undefined) => void;
  onCustomRangeApply: (range: { startDate: string; endDate: string }) => void;
  /** Disables period/sort/job controls while data loads — search stays editable. */
  controlsDisabled?: boolean;
};

function getPeriodLabel(
  period: TermCardPeriodPreset,
  customStartDate?: string,
  customEndDate?: string,
) {
  if (period === "custom" && customStartDate && customEndDate) {
    return `${customStartDate} – ${customEndDate}`;
  }

  return TERM_CARD_PERIOD_LABELS[period];
}

function isAllJobsSelected(jobIds: string[]) {
  return jobIds.length === 0;
}

function isJobSelected(jobIds: string[], jobId: string) {
  return isAllJobsSelected(jobIds) || jobIds.includes(jobId);
}

function toggleJob(
  selectedIds: string[],
  jobId: string,
  allJobIds: string[],
) {
  if (isAllJobsSelected(selectedIds)) {
    return [jobId];
  }

  const isSelected = selectedIds.includes(jobId);
  if (isSelected) {
    const next = selectedIds.filter((id) => id !== jobId);
    return next.length === 0 ? [] : next;
  }

  const next = [...selectedIds, jobId];
  if (allJobIds.length > 0 && allJobIds.every((id) => next.includes(id))) {
    return [];
  }

  return next;
}

const unselectedSourceTagClassName =
  "border-emerald-200 text-foreground hover:border-emerald-300 hover:bg-emerald-50/80 dark:border-emerald-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30";

const selectedSourceTagClassName =
  "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:border-emerald-700 hover:bg-emerald-700 hover:text-white dark:border-emerald-600 dark:bg-emerald-600 dark:hover:border-emerald-500 dark:hover:bg-emerald-500";

export function TermListToolbar({
  period,
  sort,
  jobIds,
  jobs,
  groups,
  search,
  groupId,
  customStartDate,
  customEndDate,
  onPeriodChange,
  onSortChange,
  onJobIdsChange,
  onSearchChange,
  onGroupIdChange,
  onCustomRangeApply,
  controlsDisabled = false,
}: TermListToolbarProps) {
  const periodLabel = getPeriodLabel(period, customStartDate, customEndDate);
  const sortLabel = TERM_CARD_SORT_LABELS[sort];
  const groupLabel =
    groups.find((group) => group.id === groupId)?.name ?? ALL_GROUPS_LABEL;
  const allJobIds = jobs.map((job) => job.id);
  const allJobsSelected = isAllJobsSelected(jobIds);

  const filterControlCount = groups.length > 0 ? 3 : 2;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={TERM_CONFIG.listSearchPlaceholder}
            className="pl-8"
            aria-label="Search terms"
          />
        </div>

        <div
          className={cn(
            "grid min-w-0 grid-cols-1 gap-3",
            filterControlCount === 3
              ? "sm:grid-cols-2 lg:grid-cols-3"
              : "sm:grid-cols-2",
          )}
        >
          <div className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full min-w-0 justify-between gap-2"
                    disabled={controlsDisabled}
                  />
                }
              >
                <span className="min-w-0 truncate">{periodLabel}</span>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuRadioGroup
                  value={period}
                  onValueChange={(value) =>
                    onPeriodChange(value as TermCardPeriodPreset)
                  }
                >
                  {TERM_CARD_PERIOD_PRESETS.filter(
                    (option) => option !== "custom",
                  ).map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {TERM_CARD_PERIOD_LABELS[option]}
                    </DropdownMenuRadioItem>
                  ))}
                  <DropdownMenuRadioItem value="custom">
                    {TERM_CARD_PERIOD_LABELS.custom}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {groups.length > 0 ? (
            <div className="min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full min-w-0 justify-between gap-2"
                      disabled={controlsDisabled}
                    />
                  }
                >
                  <span className="min-w-0 truncate">{groupLabel}</span>
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-44">
                  <DropdownMenuRadioGroup
                    value={groupId ?? "all"}
                    onValueChange={(value) =>
                      onGroupIdChange(value === "all" ? undefined : value)
                    }
                  >
                    <DropdownMenuRadioItem value="all">
                      {ALL_GROUPS_LABEL}
                    </DropdownMenuRadioItem>
                    {groups.map((group) => (
                      <DropdownMenuRadioItem key={group.id} value={group.id}>
                        {group.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}

          <div
            className={cn(
              "min-w-0",
              filterControlCount === 3 && "sm:col-span-2 lg:col-span-1",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full min-w-0 justify-between gap-2"
                    disabled={controlsDisabled}
                  />
                }
              >
                <span className="min-w-0 truncate">Sort: {sortLabel}</span>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) =>
                    onSortChange(value as TermCardSort)
                  }
                >
                  {TERM_CARD_SORT_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {TERM_CARD_SORT_LABELS[option]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {jobs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "rounded-full",
                allJobsSelected
                  ? selectedSourceTagClassName
                  : unselectedSourceTagClassName,
              )}
              disabled={controlsDisabled}
              onClick={() => onJobIdsChange([])}
            >
              {ALL_JOBS_LABEL}
            </Button>

            {jobs.map((job) => {
              const selected = isJobSelected(jobIds, job.id);

              return (
                <Button
                  key={job.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "rounded-full",
                    selected
                      ? selectedSourceTagClassName
                      : unselectedSourceTagClassName,
                  )}
                  disabled={controlsDisabled}
                  onClick={() =>
                    onJobIdsChange(toggleJob(jobIds, job.id, allJobIds))
                  }
                >
                  {job.name}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      <TermCustomPeriodDialog
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
