"use client";

import { ChevronDownIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  filterSortListItems,
  LIST_SORT_OPTIONS,
  type ListSortOption,
} from "@/lib/dashboard/filter-sort-list-items";
import { cn } from "@/lib/utils";

export type ResourceListRowItem = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  subtitle?: string;
  meta?: string;
  badge?: {
    label: string;
    className?: string;
  };
  leading?: {
    initials: string;
    className: string;
  };
  avatarUrl?: string;
};

type ResourceListPageProps = {
  title: string;
  description?: string;
  items: ResourceListRowItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  createHref?: string;
  createLabel?: string;
  headerAction?: ReactNode;
  getItemHref?: (item: ResourceListRowItem) => string;
  isLoading?: boolean;
  errorMessage?: string;
};

function formatListDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function ResourceListRow({
  item,
  href,
}: {
  item: ResourceListRowItem;
  href?: string;
}) {
  const content = (
    <>
      {item.leading ? (
        item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.avatarUrl}
            alt=""
            className={cn(
              "size-10 shrink-0 rounded-full object-cover",
              item.leading.className,
            )}
          />
        ) : (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              item.leading.className,
            )}
          >
            {item.leading.initials}
          </div>
        )
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-medium">{item.name}</p>
          {item.badge ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                item.badge.className ?? "bg-muted text-muted-foreground",
              )}
            >
              {item.badge.label}
            </span>
          ) : null}
        </div>
        {item.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        ) : null}
        {item.description ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        {item.meta ? (
          <p className="text-xs text-muted-foreground">{item.meta}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {formatListDate(item.createdAt)}
        </p>
      </div>
    </>
  );

  const className =
    "flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-muted/20 hover:shadow-sm sm:gap-4 sm:px-5";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function ResourceListPage({
  title,
  description,
  items,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Items will appear here once you add them.",
  createHref,
  createLabel = "Create",
  headerAction,
  getItemHref,
  isLoading = false,
  errorMessage,
}: ResourceListPageProps) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<ListSortOption>("created-desc");

  const filteredItems = useMemo(
    () => filterSortListItems(items, keyword, sort),
    [items, keyword, sort],
  );

  const activeSortLabel =
    LIST_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Sort";

  const hasKeyword = keyword.trim().length > 0;
  const showEmptyState = !isLoading && !errorMessage && filteredItems.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {headerAction ??
          (createHref ? (
            <Button
              nativeButton={false}
              render={<Link href={createHref} />}
              className="shrink-0"
            >
              <PlusIcon data-icon="inline-start" />
              {createLabel}
            </Button>
          ) : null)}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by name..."
            className="pl-8"
            aria-label="Search list"
            disabled={isLoading}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between sm:w-auto sm:min-w-40"
                disabled={isLoading}
              />
            }
          >
            {activeSortLabel}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => setSort(value as ListSortOption)}
            >
              {LIST_SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {errorMessage ? (
        <ResourceListEmpty
          title="Could not load items"
          description={errorMessage}
        />
      ) : isLoading ? (
        <ul className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-[74px] w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {filteredItems.length} of {items.length}
          </p>

          {showEmptyState ? (
            <ResourceListEmpty
              title={hasKeyword ? "No matching results" : emptyTitle}
              description={
                hasKeyword
                  ? "Try a different search term or clear the filter."
                  : emptyDescription
              }
              actionLabel={
                !hasKeyword && createHref ? createLabel : undefined
              }
              actionHref={!hasKeyword && createHref ? createHref : undefined}
            />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <ResourceListRow
                    item={item}
                    href={getItemHref?.(item)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
