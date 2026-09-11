"use client";

import { ChevronDownIcon } from "lucide-react";

import { TermCustomPeriodDialog } from "@/components/terms/term-custom-period-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JobListItem } from "@/lib/jobs/types";
import {
  TERM_CARD_PERIOD_LABELS,
  TERM_CARD_PERIOD_PRESETS,
  TERM_CARD_SORT_LABELS,
  TERM_CARD_SORT_OPTIONS,
  type TermCardPeriodPreset,
  type TermCardSort,
} from "@/lib/terms/term-card-config";
import { cn } from "@/lib/utils";

const ALL_JOBS_LABEL = "All jobs";

type TermListToolbarProps = {
  period: TermCardPeriodPreset;
  sort: TermCardSort;
  jobIds: string[];
  jobs: JobListItem[];
  customStartDate?: string;
  customEndDate?: string;
  onPeriodChange: (period: TermCardPeriodPreset) => void;
  onSortChange: (sort: TermCardSort) => void;
  onJobIdsChange: (jobIds: string[]) => void;
  onCustomRangeApply: (range: { startDate: string; endDate: string }) => void;
  disabled?: boolean;
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
  customStartDate,
  customEndDate,
  onPeriodChange,
  onSortChange,
  onJobIdsChange,
  onCustomRangeApply,
  disabled = false,
}: TermListToolbarProps) {
  const periodLabel = getPeriodLabel(period, customStartDate, customEndDate);
  const sortLabel = TERM_CARD_SORT_LABELS[sort];
  const allJobIds = jobs.map((job) => job.id);
  const allJobsSelected = isAllJobsSelected(jobIds);

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
                onValueChange={(value) => onSortChange(value as TermCardSort)}
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
              disabled={disabled}
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
                  disabled={disabled}
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
