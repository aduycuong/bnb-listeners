"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { TermCard } from "@/components/terms/term-card";
import { TermBulkDeleteDialog } from "@/components/terms/term-bulk-delete-dialog";
import { TermDeleteDialog } from "@/components/terms/term-delete-dialog";
import { TermFormDialog } from "@/components/terms/term-form-dialog";
import { TermMergeDialog } from "@/components/terms/term-merge-dialog";
import { TermListToolbar } from "@/components/terms/term-list-toolbar";
import { termGroupsQueryKey } from "@/components/term-groups/term-group-query-keys";
import {
  termCardsQueryKey,
  workspaceJobsQueryKey,
  type TermCardsQueryFilters,
} from "@/components/terms/term-query-keys";
import { TermSelectionBar } from "@/components/terms/term-selection-bar";
import { useSelectedTermIds } from "@/components/terms/use-selected-term-ids";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  TERM_CARD_PAGE_SIZE,
  type TermCardPeriodPreset,
  type TermCardSort,
} from "@/lib/terms/term-card-config";
import { getTermGroupHref } from "@/lib/term-groups/term-group-config";
import { TERM_BULK_DELETE_MAX, TERM_CONFIG, TERM_MERGE_MAX_SOURCES, getTermHref } from "@/lib/terms/term-config";
import type {
  ListTermCardsResult,
} from "@/lib/terms/types";
import type { ListJobsResult } from "@/lib/jobs/types";
import type { ListTermGroupsResult } from "@/lib/term-groups/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermListPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchTermCards(
  workspaceId: string,
  filters: TermCardsQueryFilters,
  offset: number,
): Promise<ListTermCardsResult> {
  const params = new URLSearchParams({
    period: filters.period,
    sort: filters.sort,
    offset: String(offset),
    limit: String(TERM_CARD_PAGE_SIZE),
  });

  if (filters.period === "custom") {
    if (filters.startDate) {
      params.set("startDate", filters.startDate);
    }
    if (filters.endDate) {
      params.set("endDate", filters.endDate);
    }
  }

  if (filters.jobIds && filters.jobIds.length > 0) {
    params.set("jobIds", filters.jobIds.join(","));
  }

  const search = filters.search?.trim();
  if (search) {
    params.set("search", search);
  }

  if (filters.groupId) {
    params.set("groupId", filters.groupId);
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/terms/cards?${params.toString()}`,
  );
  const data = (await res.json()) as ListTermCardsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load terms.");
  }

  return data;
}

async function fetchTermGroups(
  workspaceId: string,
): Promise<ListTermGroupsResult> {
  const res = await workspaceFetch(workspaceId, "/api/term-groups");
  const data = (await res.json()) as ListTermGroupsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load term groups.");
  }

  return data;
}

async function fetchJobs(workspaceId: string): Promise<ListJobsResult> {
  const res = await workspaceFetch(workspaceId, "/api/jobs");
  const data = (await res.json()) as ListJobsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load jobs.");
  }

  return data;
}

function TermCardSkeleton() {
  return <Skeleton className="h-72 w-full max-w-sm rounded-xl" />;
}

export function TermListPage({ workspace, workspaceIndex }: TermListPageProps) {
  const canEdit = workspace.permission !== "read";
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [period, setPeriod] = useState<TermCardPeriodPreset>("last_7_days");
  const [sort, setSort] = useState<TermCardSort>("trend");
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [groupId, setGroupId] = useState<string>();
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<
    { id: string; name: string; description: string | null } | undefined
  >();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [deletingTerm, setDeletingTerm] = useState<
    { id: string; name: string } | undefined
  >();
  const {
    selectedIds,
    selectedCount,
    toggleSelected,
    removeSelected,
    removeSelectedMany,
    clearSelected,
  } = useSelectedTermIds(workspace.id);

  const filters = useMemo<TermCardsQueryFilters>(
    () => ({
      period,
      sort,
      jobIds,
      search: deferredSearch.trim() || undefined,
      groupId,
      startDate: period === "custom" ? customStartDate : undefined,
      endDate: period === "custom" ? customEndDate : undefined,
    }),
    [customEndDate, customStartDate, deferredSearch, groupId, jobIds, period, sort],
  );

  const cardsQuery = useInfiniteQuery({
    queryKey: termCardsQueryKey(workspace.id, filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchTermCards(workspace.id, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.items.length : undefined,
    enabled: period !== "custom" || Boolean(customStartDate && customEndDate),
  });

  const jobsQuery = useQuery({
    queryKey: workspaceJobsQueryKey(workspace.id),
    queryFn: () => fetchJobs(workspace.id),
  });

  const groupsQuery = useQuery({
    queryKey: termGroupsQueryKey(workspace.id),
    queryFn: () => fetchTermGroups(workspace.id),
  });

  const jobs = jobsQuery.data?.items ?? [];
  const groups = groupsQuery.data?.items ?? [];
  const cards = useMemo(
    () => cardsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [cardsQuery.data?.pages],
  );
  const totalLoaded = cards.length;
  const resolvedPeriod = cardsQuery.data?.pages[0]?.period;
  const isInitialLoading = cardsQuery.isLoading;
  const isFetchingMore = cardsQuery.isFetchingNextPage;
  const errorMessage = cardsQuery.error?.message;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !cardsQuery.hasNextPage || cardsQuery.isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void cardsQuery.fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    cardsQuery.fetchNextPage,
    cardsQuery.hasNextPage,
    cardsQuery.isFetchingNextPage,
  ]);

  async function refreshTerms() {
    await queryClient.invalidateQueries({
      queryKey: termCardsQueryKey(workspace.id, filters),
    });
  }

  function openCreate() {
    setEditingTerm(undefined);
    setFormOpen(true);
  }

  function openEdit(termId: string) {
    const card = cards.find((item) => item.id === termId);
    if (!card) {
      return;
    }

    setEditingTerm({
      id: card.id,
      name: card.name,
      description: card.description,
    });
    setFormOpen(true);
  }

  function openDelete(termId: string) {
    const card = cards.find((item) => item.id === termId);
    if (!card) {
      return;
    }

    setDeletingTerm({ id: card.id, name: card.name });
    setDeleteOpen(true);
  }

  function handlePeriodChange(nextPeriod: TermCardPeriodPreset) {
    setPeriod(nextPeriod);
  }

  function handleCustomRangeApply(range: {
    startDate: string;
    endDate: string;
  }) {
    setCustomStartDate(range.startDate);
    setCustomEndDate(range.endDate);
    setPeriod("custom");
  }

  const hasSearch = search.trim().length > 0;
  const showEmptyState =
    !isInitialLoading &&
    !errorMessage &&
    period !== "custom" &&
    cards.length === 0;
  const waitingForCustomRange =
    period === "custom" && (!customStartDate || !customEndDate);

  const selectedTerms = useMemo(
    () =>
      selectedIds.map((id) => {
        const card = cards.find((item) => item.id === id);
        return {
          id,
          name: card?.name ?? "Unknown term",
        };
      }),
    [cards, selectedIds],
  );

  function openBulkDelete() {
    if (selectedIds.length === 0) {
      return;
    }

    if (selectedIds.length > TERM_BULK_DELETE_MAX) {
      toast.add({
        title: `Select at most ${TERM_BULK_DELETE_MAX} terms to delete at once.`,
        type: "error",
      });
      return;
    }

    setBulkDeleteOpen(true);
  }

  function openMerge() {
    if (selectedIds.length < 2) {
      return;
    }

    if (selectedIds.length > TERM_MERGE_MAX_SOURCES + 1) {
      toast.add({
        title: `Select at most ${TERM_MERGE_MAX_SOURCES + 1} terms to merge at once.`,
        type: "error",
      });
      return;
    }

    setMergeOpen(true);
  }

  async function handleDeleted() {
    if (deletingTerm) {
      removeSelected(deletingTerm.id);
    }

    await refreshTerms();
  }

  async function handleBulkDeleted(deletedIds: string[]) {
    removeSelectedMany(deletedIds);
    await refreshTerms();
  }

  async function handleMerged({
    deletedIds,
  }: {
    targetId: string;
    deletedIds: string[];
  }) {
    removeSelectedMany(deletedIds);
    await refreshTerms();
  }

  return (
    <>
      <div
        className={cn(
          "mx-auto w-full max-w-7xl px-4 py-8 md:px-8",
          selectedCount > 0 && "pb-24",
        )}
      >
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {TERM_CONFIG.listTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {TERM_CONFIG.listDescription}
            </p>
            {resolvedPeriod ? (
              <p className="text-xs text-muted-foreground">
                Metrics for {resolvedPeriod.startDate} –{" "}
                {resolvedPeriod.endDate}
              </p>
            ) : null}
          </div>

          {canEdit ? (
            <Button type="button" className="shrink-0" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              {TERM_CONFIG.createLabel}
            </Button>
          ) : null}
        </div>

        <div className="mb-5">
          <TermListToolbar
            period={period}
            sort={sort}
            jobIds={jobIds}
            jobs={jobs}
            search={search}
            groups={groups}
            groupId={groupId}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onPeriodChange={handlePeriodChange}
            onSortChange={setSort}
            onJobIdsChange={setJobIds}
            onSearchChange={setSearch}
            onGroupIdChange={setGroupId}
            onCustomRangeApply={handleCustomRangeApply}
            controlsDisabled={isInitialLoading}
          />
        </div>

        {errorMessage ? (
          <ResourceListEmpty
            title="Could not load terms"
            description={errorMessage}
          />
        ) : waitingForCustomRange ? (
          <ResourceListEmpty
            title="Choose a custom range"
            description="Select start and end dates to load term metrics for that period."
          />
        ) : isInitialLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <TermCardSkeleton key={index} />
            ))}
          </div>
        ) : showEmptyState ? (
          <ResourceListEmpty
            title={
              hasSearch
                ? TERM_CONFIG.listSearchEmptyTitle
                : TERM_CONFIG.emptyTitle
            }
            description={
              hasSearch
                ? TERM_CONFIG.listSearchEmptyDescription
                : canEdit
                  ? TERM_CONFIG.emptyDescription
                  : "Terms will appear here once they are added to this workspace."
            }
            actionLabel={
              hasSearch || !canEdit ? undefined : TERM_CONFIG.createLabel
            }
            onAction={hasSearch || !canEdit ? undefined : openCreate}
          />
        ) : (
          <>
            <p className="mb-4 text-xs text-muted-foreground">
              Showing {totalLoaded} term{totalLoaded === 1 ? "" : "s"}
            </p>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
              {cards.map((term) => (
                <TermCard
                  key={term.id}
                  term={term}
                  href={getTermHref(workspaceIndex, term.id)}
                  getGroupHref={(groupId) =>
                    getTermGroupHref(workspaceIndex, groupId)
                  }
                  canEdit={canEdit}
                  selected={selectedIds.includes(term.id)}
                  onEdit={openEdit}
                  onSelect={toggleSelected}
                  onDelete={openDelete}
                />
              ))}

              {isFetchingMore
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TermCardSkeleton key={`loading-${index}`} />
                  ))
                : null}
            </div>

            <div ref={loadMoreRef} className="h-8" aria-hidden />
          </>
        )}
      </div>

      <TermFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workspaceId={workspace.id}
        term={editingTerm}
        onSaved={refreshTerms}
      />

      <TermDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspace.id}
        term={deletingTerm}
        onDeleted={handleDeleted}
      />

      <TermBulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        workspaceId={workspace.id}
        terms={selectedTerms}
        onDeleted={handleBulkDeleted}
      />

      <TermMergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        workspaceId={workspace.id}
        terms={selectedTerms}
        onMerged={handleMerged}
      />

      {canEdit ? (
        <TermSelectionBar
          count={selectedCount}
          onDelete={openBulkDelete}
          onMerge={openMerge}
          onCancel={clearSelected}
          deleteDisabled={bulkDeleteOpen}
        />
      ) : null}
    </>
  );
}
