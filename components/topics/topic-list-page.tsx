"use client";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { TopicCard } from "@/components/topics/topic-card";
import { TopicDeleteDialog } from "@/components/topics/topic-delete-dialog";
import { TopicFormDialog } from "@/components/topics/topic-form-dialog";
import {
  topicCardsQueryKey,
  topicsQueryKey,
  type TopicCardsQueryFilters,
} from "@/components/topics/topic-query-keys";
import { TopicListToolbar } from "@/components/topics/topic-list-toolbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TOPIC_CARD_PAGE_SIZE,
  type TopicCardPeriodPreset,
  type TopicCardSort,
} from "@/lib/topics/topic-card-config";
import { TOPIC_CONFIG } from "@/lib/topics/topic-config";
import type {
  ListTopicCardsResult,
  ListTopicsResult,
  TopicCardItem,
  TopicListItem,
} from "@/lib/topics/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TopicListPageProps = {
  workspace: WorkspaceListItem;
};

async function fetchTopicCards(
  workspaceId: string,
  filters: TopicCardsQueryFilters,
  offset: number,
): Promise<ListTopicCardsResult> {
  const params = new URLSearchParams({
    period: filters.period,
    sort: filters.sort,
    offset: String(offset),
    limit: String(TOPIC_CARD_PAGE_SIZE),
  });

  if (filters.period === "custom") {
    if (filters.startDate) {
      params.set("startDate", filters.startDate);
    }
    if (filters.endDate) {
      params.set("endDate", filters.endDate);
    }
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/topics/cards?${params.toString()}`,
  );
  const data = (await res.json()) as ListTopicCardsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load topics.");
  }

  return data;
}

async function fetchTopics(workspaceId: string): Promise<ListTopicsResult> {
  const res = await workspaceFetch(workspaceId, "/api/topics");
  const data = (await res.json()) as ListTopicsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load topics.");
  }

  return data;
}

function TopicCardSkeleton() {
  return <Skeleton className="h-72 w-full max-w-sm rounded-xl" />;
}

export function TopicListPage({ workspace }: TopicListPageProps) {
  const canEdit = workspace.permission !== "read";
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [period, setPeriod] = useState<TopicCardPeriodPreset>("last_7_days");
  const [sort, setSort] = useState<TopicCardSort>("trend");
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicListItem | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<
    TopicListItem | undefined
  >();

  const filters = useMemo<TopicCardsQueryFilters>(
    () => ({
      period,
      sort,
      startDate: period === "custom" ? customStartDate : undefined,
      endDate: period === "custom" ? customEndDate : undefined,
    }),
    [customEndDate, customStartDate, period, sort],
  );

  const cardsQuery = useInfiniteQuery({
    queryKey: topicCardsQueryKey(workspace.id, filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchTopicCards(workspace.id, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.items.length : undefined,
    enabled: period !== "custom" || Boolean(customStartDate && customEndDate),
  });

  const topicsQuery = useQuery({
    queryKey: topicsQueryKey(workspace.id),
    queryFn: () => fetchTopics(workspace.id),
    enabled: formOpen || deleteOpen,
  });

  const topics = topicsQuery.data?.items ?? [];
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

  async function refreshTopics() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: topicsQueryKey(workspace.id),
      }),
      queryClient.invalidateQueries({
        queryKey: topicCardsQueryKey(workspace.id, filters),
      }),
    ]);
  }

  function openCreate() {
    setEditingTopic(undefined);
    setFormOpen(true);
  }

  function openEdit(topicId: string) {
    const card = cards.find((item) => item.id === topicId);
    if (!card) {
      return;
    }

    setEditingTopic(cardToListItem(card, topics));
    setFormOpen(true);
  }

  function openDelete(topicId: string) {
    const card = cards.find((item) => item.id === topicId);
    if (!card) {
      return;
    }

    setDeletingTopic(cardToListItem(card, topics));
    setDeleteOpen(true);
  }

  function handlePeriodChange(nextPeriod: TopicCardPeriodPreset) {
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

  const showEmptyState =
    !isInitialLoading &&
    !errorMessage &&
    period !== "custom" &&
    cards.length === 0;
  const waitingForCustomRange =
    period === "custom" && (!customStartDate || !customEndDate);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {TOPIC_CONFIG.listTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {TOPIC_CONFIG.listDescription}
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
              {TOPIC_CONFIG.createLabel}
            </Button>
          ) : null}
        </div>

        <div className="mb-5">
          <TopicListToolbar
            period={period}
            sort={sort}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onPeriodChange={handlePeriodChange}
            onSortChange={setSort}
            onCustomRangeApply={handleCustomRangeApply}
            disabled={isInitialLoading}
          />
        </div>

        {errorMessage ? (
          <ResourceListEmpty
            title="Could not load topics"
            description={errorMessage}
          />
        ) : waitingForCustomRange ? (
          <ResourceListEmpty
            title="Choose a custom range"
            description="Select start and end dates to load topic metrics for that period."
          />
        ) : isInitialLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <TopicCardSkeleton key={index} />
            ))}
          </div>
        ) : showEmptyState ? (
          <ResourceListEmpty
            title={TOPIC_CONFIG.emptyTitle}
            description={
              canEdit
                ? TOPIC_CONFIG.emptyDescription
                : "Topics will appear here once they are added to this workspace."
            }
            actionLabel={canEdit ? TOPIC_CONFIG.createLabel : undefined}
            onAction={canEdit ? openCreate : undefined}
          />
        ) : (
          <>
            <p className="mb-4 text-xs text-muted-foreground">
              Showing {totalLoaded} topic{totalLoaded === 1 ? "" : "s"}
            </p>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
              {cards.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  canEdit={canEdit}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              ))}

              {isFetchingMore
                ? Array.from({ length: 4 }).map((_, index) => (
                    <TopicCardSkeleton key={`loading-${index}`} />
                  ))
                : null}
            </div>

            <div ref={loadMoreRef} className="h-8" aria-hidden />
          </>
        )}
      </div>

      <TopicFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        workspaceId={workspace.id}
        topics={topics}
        topic={editingTopic}
        onSaved={refreshTopics}
      />

      <TopicDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspaceId={workspace.id}
        topic={deletingTopic}
        onDeleted={refreshTopics}
      />
    </>
  );
}

function cardToListItem(
  card: TopicCardItem,
  topics: TopicListItem[],
): TopicListItem {
  const existing = topics.find((topic) => topic.id === card.id);
  if (existing) {
    return existing;
  }

  return {
    id: card.id,
    name: card.name,
    parentId: null,
    parentName: card.parentName,
    description: card.description,
    verified: card.verified,
    createdBy: card.createdBy,
    sourceDocumentId: null,
    createdAt: card.createdAt,
    updatedAt: card.createdAt,
  };
}
