"use client";

import {
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { TopicDetailChartSection } from "@/components/topics/topic-detail-chart-section";
import { TopicDetailDocuments } from "@/components/topics/topic-detail-documents";
import { TopicDetailGeneral } from "@/components/topics/topic-detail-general";
import { TopicDetailListeningSection } from "@/components/topics/topic-detail-listening-section";
import {
  topicChartQueryKey,
  topicDocumentsQueryKey,
  topicQueryKey,
  workspaceJobsQueryKey,
  type TopicChartQueryFilters,
  type TopicDocumentsQueryFilters,
} from "@/components/topics/topic-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE } from "@/lib/topics/topic-detail-chart-config";
import type {
  TopicDetailChartMetric,
  TopicDetailChartPeriodPreset,
} from "@/lib/topics/topic-detail-chart-config";
import { getDocumentHref } from "@/lib/documents/document-config";
import { getTopicHref } from "@/lib/topics/topic-config";
import type {
  GetTopicChartResult,
  GetTopicResult,
  ListTopicDocumentsResult,
} from "@/lib/topics/types";
import type { ListJobsResult } from "@/lib/jobs/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TopicDetailPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  topicId: string;
};

async function fetchTopic(
  workspaceId: string,
  topicId: string,
): Promise<GetTopicResult> {
  const res = await workspaceFetch(workspaceId, `/api/topics/${topicId}`);
  const data = (await res.json()) as GetTopicResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load topic.");
  }

  return data;
}

async function fetchTopicChart(
  workspaceId: string,
  topicId: string,
  filters: TopicChartQueryFilters,
): Promise<GetTopicChartResult> {
  const params = new URLSearchParams({
    period: filters.period,
    metric: filters.metric,
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
    `/api/topics/${topicId}/chart?${params.toString()}`,
  );
  const data = (await res.json()) as GetTopicChartResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load chart.");
  }

  return data;
}

async function fetchTopicDocuments(
  workspaceId: string,
  topicId: string,
  filters: TopicDocumentsQueryFilters,
  offset: number,
): Promise<ListTopicDocumentsResult> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE),
  });

  if (filters.jobIds.length > 0) {
    params.set("jobIds", filters.jobIds.join(","));
  }

  const search = filters.search.trim();
  if (search) {
    params.set("search", search);
  }

  const res = await workspaceFetch(
    workspaceId,
    `/api/topics/${topicId}/documents?${params.toString()}`,
  );
  const data = (await res.json()) as ListTopicDocumentsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load documents.");
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

export function TopicDetailPage({
  workspace,
  workspaceIndex,
  topicId,
}: TopicDetailPageProps) {
  const [period, setPeriod] =
    useState<TopicDetailChartPeriodPreset>("last_7_days");
  const [metric, setMetric] = useState<TopicDetailChartMetric>("doc_count");
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();
  const router = useRouter();
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const chartFilters = useMemo<TopicChartQueryFilters>(
    () => ({
      period,
      metric,
      startDate: customStartDate,
      endDate: customEndDate,
    }),
    [customEndDate, customStartDate, metric, period],
  );

  const documentFilters = useMemo<TopicDocumentsQueryFilters>(
    () => ({
      jobIds,
      search: deferredSearch,
    }),
    [deferredSearch, jobIds],
  );

  const waitingForCustomRange =
    period === "custom" && (!customStartDate || !customEndDate);

  const topicQuery = useQuery({
    queryKey: topicQueryKey(workspace.id, topicId),
    queryFn: () => fetchTopic(workspace.id, topicId),
    refetchInterval: (query) => {
      const activeRun = query.state.data?.activeBackfillRun;
      if (
        activeRun &&
        (activeRun.status === "pending" || activeRun.status === "running")
      ) {
        return 3000;
      }

      return false;
    },
  });

  const chartQuery = useQuery({
    queryKey: topicChartQueryKey(workspace.id, topicId, chartFilters),
    queryFn: () => fetchTopicChart(workspace.id, topicId, chartFilters),
    enabled: !waitingForCustomRange,
    refetchInterval: (query) =>
      query.state.data?.digest.isStale ? 5000 : false,
  });

  const documentsQuery = useInfiniteQuery({
    queryKey: topicDocumentsQueryKey(workspace.id, topicId, documentFilters),
    queryFn: ({ pageParam = 0 }) =>
      fetchTopicDocuments(
        workspace.id,
        topicId,
        documentFilters,
        pageParam,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.items.length : undefined,
  });

  const jobsQuery = useQuery({
    queryKey: workspaceJobsQueryKey(workspace.id),
    queryFn: () => fetchJobs(workspace.id),
  });

  const topic = topicQuery.data;
  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [documentsQuery.data?.pages],
  );
  const jobs = jobsQuery.data?.items ?? [];

  function openDocument(documentId: string) {
    router.push(getDocumentHref(workspaceIndex, documentId));
  }

  if (topicQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (topicQuery.error || !topic) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <ResourceListEmpty
          title="Could not load topic"
          description={topicQuery.error?.message ?? "Topic not found."}
          actionLabel="Back to topics"
          actionHref={getTopicHref(workspaceIndex)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-8">
        <div className="space-y-4">
          <Button
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="-ml-2 w-fit"
            render={<Link href={getTopicHref(workspaceIndex)} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Topics
          </Button>

          <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TopicDetailGeneral
            topic={topic}
            onSourceDocumentClick={openDocument}
          />

          {waitingForCustomRange ? (
            <ResourceListEmpty
              title="Choose a custom range"
              description="Select start and end dates to load chart metrics for that period."
            />
          ) : (
            <TopicDetailChartSection
              period={period}
              metric={metric}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              chart={chartQuery.data}
              isLoading={chartQuery.isLoading}
              errorMessage={chartQuery.error?.message}
              onPeriodChange={setPeriod}
              onMetricChange={setMetric}
              onCustomRangeApply={(range) => {
                setCustomStartDate(range.startDate);
                setCustomEndDate(range.endDate);
              }}
            />
          )}
        </div>

        <TopicDetailListeningSection
          workspaceId={workspace.id}
          topic={topic}
          canEdit={
            workspace.permission === "edit" ||
            workspace.permission === "owner"
          }
          onTopicUpdated={async () => {
            await topicQuery.refetch();
            await chartQuery.refetch();
            await documentsQuery.refetch();
          }}
        />

        <TopicDetailDocuments
          documents={documents}
          jobs={jobs}
          jobIds={jobIds}
          search={search}
          totalLoaded={documents.length}
          isInitialLoading={documentsQuery.isLoading}
          isFetchingMore={documentsQuery.isFetchingNextPage}
          errorMessage={documentsQuery.error?.message}
          hasNextPage={documentsQuery.hasNextPage ?? false}
          onJobIdsChange={setJobIds}
          onSearchChange={setSearch}
          onLoadMore={() => {
            void documentsQuery.fetchNextPage();
          }}
          onDocumentClick={openDocument}
        />
    </div>
  );
}
