"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ResourceListRow,
  type ResourceListRowItem,
} from "@/components/dashboard/resource-list-page";
import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { DocumentJobSourceFilter } from "@/components/documents/document-job-source-filter";
import {
  documentsQueryKey,
  type DocumentsQueryFilters,
} from "@/components/documents/document-query-keys";
import { workspaceJobsQueryKey } from "@/components/topics/topic-query-keys";
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
import {
  DOCUMENT_CONFIG,
  getDocumentHref,
  getEmbeddingStatusBadge,
} from "@/lib/documents/document-config";
import { DOCUMENT_LIST_PAGE_SIZE } from "@/lib/documents/document-list-config";
import type { DocumentListItem, ListDocumentsResult } from "@/lib/documents/types";
import type { ListJobsResult } from "@/lib/jobs/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentListPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchDocuments(
  workspaceId: string,
  filters: DocumentsQueryFilters,
  offset: number,
): Promise<ListDocumentsResult> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(DOCUMENT_LIST_PAGE_SIZE),
  });

  if (filters.jobIds.length > 0) {
    params.set("jobIds", filters.jobIds.join(","));
  }

  const res = await workspaceFetch(workspaceId, `/api/documents?${params.toString()}`);
  const data = (await res.json()) as ListDocumentsResult & {
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

function truncateContent(content: string, maxLength = 120) {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function toListRowItem(doc: DocumentListItem): ResourceListRowItem {
  const statusBadge = getEmbeddingStatusBadge(doc.embeddingStatus);

  return {
    id: doc.id,
    name: doc.title?.trim() || doc.sourceId,
    subtitle: [doc.sourceName, doc.docType, doc.jobName ? `from ${doc.jobName}` : null]
      .filter(Boolean)
      .join(" · "),
    description: truncateContent(doc.rawContent),
    date: doc.publishedAt ?? doc.createdAt,
    meta:
      doc.qualityScore != null
        ? `Quality ${Math.round(doc.qualityScore * 100)}%`
        : undefined,
    badges: [statusBadge],
  };
}

export function DocumentListPage({
  workspace,
  workspaceIndex,
}: DocumentListPageProps) {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [jobIds, setJobIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<ListSortOption>("date-desc");

  const filters = useMemo<DocumentsQueryFilters>(
    () => ({ jobIds }),
    [jobIds],
  );

  const documentsQuery = useInfiniteQuery({
    queryKey: documentsQueryKey(workspace.id, filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchDocuments(workspace.id, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.items.length : undefined,
  });

  const jobsQuery = useQuery({
    queryKey: workspaceJobsQueryKey(workspace.id),
    queryFn: () => fetchJobs(workspace.id),
  });

  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [documentsQuery.data?.pages],
  );

  const listItems = useMemo(
    () => filterSortListItems(documents.map(toListRowItem), keyword, sort),
    [documents, keyword, sort],
  );

  const jobs = jobsQuery.data?.items ?? [];
  const totalLoaded = documents.length;
  const isInitialLoading = documentsQuery.isLoading;
  const isFetchingMore = documentsQuery.isFetchingNextPage;
  const errorMessage = documentsQuery.error?.message;
  const activeSortLabel =
    LIST_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Sort";
  const hasKeyword = keyword.trim().length > 0;
  const showEmptyState =
    !isInitialLoading && !errorMessage && listItems.length === 0;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (
      !sentinel ||
      !documentsQuery.hasNextPage ||
      documentsQuery.isFetchingNextPage
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void documentsQuery.fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    documentsQuery.fetchNextPage,
    documentsQuery.hasNextPage,
    documentsQuery.isFetchingNextPage,
  ]);

  function handleItemClick(item: ResourceListRowItem) {
    router.push(getDocumentHref(workspaceIndex, item.id));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {DOCUMENT_CONFIG.listTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {DOCUMENT_CONFIG.listDescription}
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <DocumentJobSourceFilter
            jobs={jobs}
            jobIds={jobIds}
            onJobIdsChange={setJobIds}
            disabled={isInitialLoading}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search loaded documents..."
                className="pl-8"
                aria-label="Search documents"
                disabled={isInitialLoading}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-between sm:w-auto sm:min-w-40"
                    disabled={isInitialLoading}
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
        </div>

        {errorMessage ? (
          <ResourceListEmpty
            title="Could not load documents"
            description={errorMessage}
          />
        ) : isInitialLoading ? (
          <ul className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="h-18.5 w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : showEmptyState ? (
          <ResourceListEmpty
            title={hasKeyword ? "No matching results" : DOCUMENT_CONFIG.emptyTitle}
            description={
              hasKeyword
                ? "Try a different search term or clear the filter."
                : "Documents appear here after a scrape job ingests content."
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {hasKeyword
                ? `${listItems.length} matching of ${totalLoaded} loaded`
                : `${totalLoaded} document${totalLoaded === 1 ? "" : "s"} loaded`}
            </p>

            <ul className="flex flex-col gap-2.5">
              {listItems.map((item) => (
                <li key={item.id}>
                  <ResourceListRow
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                </li>
              ))}

              {isFetchingMore
                ? Array.from({ length: 2 }).map((_, index) => (
                    <li key={`loading-${index}`}>
                      <Skeleton className="h-18.5 w-full rounded-xl" />
                    </li>
                  ))
                : null}
            </ul>

            <div ref={loadMoreRef} className="h-8" aria-hidden />
          </>
        )}
    </div>
  );
}
