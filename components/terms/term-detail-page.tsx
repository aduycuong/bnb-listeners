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
import { TermDetailChartSection } from "@/components/terms/term-detail-chart-section";
import { TermDetailDocuments } from "@/components/terms/term-detail-documents";
import { TermDetailGeneral } from "@/components/terms/term-detail-general";
import { TermDetailListeningSection } from "@/components/terms/term-detail-listening-section";
import {
  termChartQueryKey,
  termDocumentsQueryKey,
  termQueryKey,
  workspaceJobsQueryKey,
  type TermChartQueryFilters,
  type TermDocumentsQueryFilters,
} from "@/components/terms/term-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TERM_DETAIL_DOCUMENTS_PAGE_SIZE } from "@/lib/terms/term-detail-chart-config";
import type {
  TermDetailChartMetric,
  TermDetailChartPeriodPreset,
} from "@/lib/terms/term-detail-chart-config";
import { getDocumentHref } from "@/lib/documents/document-config";
import { getTermHref } from "@/lib/terms/term-config";
import type {
  GetTermChartResult,
  GetTermResult,
  ListTermDocumentsResult,
} from "@/lib/terms/types";
import type { ListJobsResult } from "@/lib/jobs/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermDetailPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  termId: string;
};

async function fetchTopic(
  workspaceId: string,
  termId: string,
): Promise<GetTermResult> {
  const res = await workspaceFetch(workspaceId, `/api/terms/${termId}`);
  const data = (await res.json()) as GetTermResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load term.");
  }

  return data;
}

async function fetchTermChart(
  workspaceId: string,
  termId: string,
  filters: TermChartQueryFilters,
): Promise<GetTermChartResult> {
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
    `/api/terms/${termId}/chart?${params.toString()}`,
  );
  const data = (await res.json()) as GetTermChartResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load chart.");
  }

  return data;
}

async function fetchTermDocuments(
  workspaceId: string,
  termId: string,
  filters: TermDocumentsQueryFilters,
  offset: number,
): Promise<ListTermDocumentsResult> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(TERM_DETAIL_DOCUMENTS_PAGE_SIZE),
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
    `/api/terms/${termId}/documents?${params.toString()}`,
  );
  const data = (await res.json()) as ListTermDocumentsResult & {
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

export function TermDetailPage({
  workspace,
  workspaceIndex,
  termId,
}: TermDetailPageProps) {
  const [period, setPeriod] =
    useState<TermDetailChartPeriodPreset>("last_7_days");
  const [metric, setMetric] = useState<TermDetailChartMetric>("doc_count");
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();
  const router = useRouter();
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const chartFilters = useMemo<TermChartQueryFilters>(
    () => ({
      period,
      metric,
      startDate: customStartDate,
      endDate: customEndDate,
    }),
    [customEndDate, customStartDate, metric, period],
  );

  const documentFilters = useMemo<TermDocumentsQueryFilters>(
    () => ({
      jobIds,
      search: deferredSearch,
    }),
    [deferredSearch, jobIds],
  );

  const waitingForCustomRange =
    period === "custom" && (!customStartDate || !customEndDate);

  const termQuery = useQuery({
    queryKey: termQueryKey(workspace.id, termId),
    queryFn: () => fetchTopic(workspace.id, termId),
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
    queryKey: termChartQueryKey(workspace.id, termId, chartFilters),
    queryFn: () => fetchTermChart(workspace.id, termId, chartFilters),
    enabled: !waitingForCustomRange,
    refetchInterval: (query) =>
      query.state.data?.digest.isStale ? 5000 : false,
  });

  const documentsQuery = useInfiniteQuery({
    queryKey: termDocumentsQueryKey(workspace.id, termId, documentFilters),
    queryFn: ({ pageParam = 0 }) =>
      fetchTermDocuments(
        workspace.id,
        termId,
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

  const term = termQuery.data;
  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [documentsQuery.data?.pages],
  );
  const jobs = jobsQuery.data?.items ?? [];

  function openDocument(documentId: string) {
    router.push(getDocumentHref(workspaceIndex, documentId));
  }

  if (termQuery.isLoading) {
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

  if (termQuery.error || !term) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <ResourceListEmpty
          title="Could not load term"
          description={termQuery.error?.message ?? "Term not found."}
          actionLabel="Back to terms"
          actionHref={getTermHref(workspaceIndex)}
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
            render={<Link href={getTermHref(workspaceIndex)} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Terms
          </Button>

          <h1 className="text-2xl font-semibold tracking-tight">{term.name}</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TermDetailGeneral
            term={term}
            onSourceDocumentClick={openDocument}
          />

          {waitingForCustomRange ? (
            <ResourceListEmpty
              title="Choose a custom range"
              description="Select start and end dates to load chart metrics for that period."
            />
          ) : (
            <TermDetailChartSection
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

        <TermDetailListeningSection
          workspaceId={workspace.id}
          term={term}
          canEdit={
            workspace.permission === "edit" ||
            workspace.permission === "owner"
          }
          onTermUpdated={async () => {
            await termQuery.refetch();
            await chartQuery.refetch();
            await documentsQuery.refetch();
          }}
        />

        <TermDetailDocuments
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
