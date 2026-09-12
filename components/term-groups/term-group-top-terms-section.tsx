"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TERM_GROUP_CONFIG } from "@/lib/term-groups/term-group-config";
import type {
  ListTermGroupTopTermsResult,
  TermGroupTopTermsSort,
} from "@/lib/term-groups/types";
import { getTermHref } from "@/lib/terms/term-config";
import { TERM_CARD_SORT_LABELS } from "@/lib/terms/term-card-config";

const TOP_TERMS_SORT_OPTIONS: TermGroupTopTermsSort[] = [
  "count",
  "quality",
  "trend",
];

type TermGroupTopTermsSectionProps = {
  workspaceIndex: number;
  sort: TermGroupTopTermsSort;
  data?: ListTermGroupTopTermsResult;
  isLoading?: boolean;
  errorMessage?: string;
  onSortChange: (sort: TermGroupTopTermsSort) => void;
};

function formatScore(value: number | null) {
  if (value === null) {
    return "—";
  }

  return value.toFixed(1);
}

function getMetricValue(
  sort: TermGroupTopTermsSort,
  digest: ListTermGroupTopTermsResult["items"][number]["digest"],
) {
  switch (sort) {
    case "count":
      return digest.docCount.toLocaleString();
    case "quality":
      return formatScore(digest.avgQualityScore);
    case "trend":
      return formatScore(digest.trendScore);
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

function getMetricLabel(sort: TermGroupTopTermsSort) {
  switch (sort) {
    case "count":
      return "Docs";
    case "quality":
      return "Quality";
    case "trend":
      return "Trend";
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

export function TermGroupTopTermsSection({
  workspaceIndex,
  sort,
  data,
  isLoading = false,
  errorMessage,
  onSortChange,
}: TermGroupTopTermsSectionProps) {
  const items = data?.items ?? [];
  const hasStale = items.some((item) => item.digest.isStale);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {TERM_GROUP_CONFIG.detailTopTermsTitle}
              {hasStale ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span
                        className="relative flex size-3 shrink-0 items-center justify-center"
                        aria-label="Updating metrics"
                      />
                    }
                  >
                    <span className="absolute size-2 animate-ping rounded-full bg-sky-400 opacity-75" />
                    <span className="relative size-2 rounded-full bg-sky-500" />
                  </TooltipTrigger>
                  <TooltipContent>Updating metrics</TooltipContent>
                </Tooltip>
              ) : null}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {TERM_GROUP_CONFIG.detailTopTermsDescription}
              {data ? (
                <>
                  {" "}
                  ({data.period.startDate} – {data.period.endDate})
                </>
              ) : null}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-w-36 justify-between"
                  disabled={isLoading}
                />
              }
            >
              {TERM_CARD_SORT_LABELS[sort]}
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) =>
                  onSortChange(value as TermGroupTopTermsSort)
                }
              >
                {TOP_TERMS_SORT_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option}>
                    {TERM_CARD_SORT_LABELS[option]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-sm font-medium">
              {TERM_GROUP_CONFIG.detailTopTermsEmptyTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {TERM_GROUP_CONFIG.detailTopTermsEmptyDescription}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {items.map((term, index) => (
              <li key={term.id}>
                <Link
                  href={getTermHref(workspaceIndex, term.id)}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span className="w-6 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {term.name}
                    </span>
                    {term.description ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {term.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">
                      {getMetricValue(sort, term.digest)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {getMetricLabel(sort)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
