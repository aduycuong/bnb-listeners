"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { DocumentDataSourceFilter } from "@/components/documents/document-data-source-filter";
import { DocumentGroupedList } from "@/components/documents/document-grouped-list";
import { DOCUMENT_LIST_ITEM_SKELETON_CLASS } from "@/components/documents/document-list-item-card";
import { DocumentDataSourceGroupFilter } from "@/components/documents/document-data-source-group-filter";
import {
  DocumentTermFilterSelect,
  DocumentTermPicker,
} from "@/components/documents/document-term-filter";
import {
  documentsQueryKey,
  type DocumentsQueryFilters,
} from "@/components/documents/document-query-keys";
import { dataSourceGroupsQueryKey } from "@/components/data-source-groups/data-source-group-query-keys";
import { workspaceJobsQueryKey } from "@/components/terms/term-query-keys";
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
  LIST_SORT_OPTIONS,
  type ListSortOption,
} from "@/lib/dashboard/filter-sort-list-items";
import { DOCUMENT_CONFIG } from "@/lib/documents/document-config";
import { DOCUMENT_LIST_PAGE_SIZE } from "@/lib/documents/document-list-config";
import { buildDocumentListGroups } from "@/lib/documents/utils/build-document-list-groups";
import { toDocumentCardItem } from "@/lib/documents/utils/to-document-card-item";
import type { DocumentTermFilterMode } from "@/lib/documents/document-term-filter-config";
import type {
  DocumentTermSummary,
  ListDocumentsResult,
} from "@/lib/documents/types";
import type { ListDataSourcesResult } from "@/lib/data-sources/types";
import type { ListDataSourceGroupsResult } from "@/lib/data-source-groups/types";
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

  if (filters.dataSourceIds.length > 0) {
    params.set("dataSourceIds", filters.dataSourceIds.join(","));
  }

  if (filters.dataSourceGroupId) {
    params.set("dataSourceGroupId", filters.dataSourceGroupId);
  }

  if (filters.termFilterMode !== "all") {
    params.set("termFilter", filters.termFilterMode);
  }

  if (filters.termFilterMode === "selected" && filters.termIds.length > 0) {
    params.set("termIds", filters.termIds.join(","));
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

async function fetchDataSourceGroups(
  workspaceId: string,
): Promise<ListDataSourceGroupsResult> {
  const res = await workspaceFetch(workspaceId, "/api/data-source-groups");
  const data = (await res.json()) as ListDataSourceGroupsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load data source groups.",
    );
  }

  return data;
}

async function fetchJobs(workspaceId: string): Promise<ListDataSourcesResult> {
  const res = await workspaceFetch(workspaceId, "/api/data-sources");
  const data = (await res.json()) as ListDataSourcesResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load dataSources.");
  }

  return data;
}

export function DocumentListPage({
  workspace,
  workspaceIndex,
}: DocumentListPageProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [dataSourceIds, setJobIds] = useState<string[]>([]);
  const [dataSourceGroupId, setDataSourceGroupId] = useState<string | null>(
    null,
  );
  const [termFilterMode, setTermFilterMode] =
    useState<DocumentTermFilterMode>("all");
  const [selectedTerms, setSelectedTerms] = useState<DocumentTermSummary[]>([]);
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<ListSortOption>("date-desc");

  const termIds = useMemo(
    () => selectedTerms.map((term) => term.id),
    [selectedTerms],
  );

  const filters = useMemo<DocumentsQueryFilters>(
    () => ({
      dataSourceIds,
      dataSourceGroupId,
      termFilterMode,
      termIds,
    }),
    [dataSourceGroupId, dataSourceIds, termFilterMode, termIds],
  );

  const documentsQuery = useInfiniteQuery({
    queryKey: documentsQueryKey(workspace.id, filters),
    queryFn: ({ pageParam = 0 }) =>
      fetchDocuments(workspace.id, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.rootCount : undefined,
  });

  const jobsQuery = useQuery({
    queryKey: workspaceJobsQueryKey(workspace.id),
    queryFn: () => fetchJobs(workspace.id),
  });

  const groupsQuery = useQuery({
    queryKey: dataSourceGroupsQueryKey(workspace.id),
    queryFn: () => fetchDataSourceGroups(workspace.id),
  });

  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [documentsQuery.data?.pages],
  );

  const cardItems = useMemo(
    () => documents.map(toDocumentCardItem),
    [documents],
  );

  const documentListGroups = useMemo(
    () => buildDocumentListGroups(cardItems, keyword, sort),
    [cardItems, keyword, sort],
  );

  const filteredDocumentCount = useMemo(
    () =>
      documentListGroups.reduce(
        (count, group) => count + 1 + group.children.length,
        0,
      ),
    [documentListGroups],
  );

  const jobs = jobsQuery.data?.items ?? [];
  const groups = groupsQuery.data?.items ?? [];
  const totalDocuments = documentsQuery.data?.pages[0]?.total ?? 0;
  const isInitialLoading = documentsQuery.isLoading;
  const isFetchingMore = documentsQuery.isFetchingNextPage;
  const errorMessage = documentsQuery.error?.message;
  const activeSortLabel =
    LIST_SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Sort";
  const hasKeyword = keyword.trim().length > 0;
  const awaitingTermSelection =
    termFilterMode === "selected" && selectedTerms.length === 0;
  const showEmptyState =
    !isInitialLoading && !errorMessage && documentListGroups.length === 0;

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {DOCUMENT_CONFIG.listTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {DOCUMENT_CONFIG.listDescription}
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <DocumentDataSourceGroupFilter
              groups={groups}
              dataSourceGroupId={dataSourceGroupId}
              onDataSourceGroupIdChange={(groupId) => {
                setDataSourceGroupId(groupId);
                if (groupId) {
                  setJobIds([]);
                }
              }}
              disabled={isInitialLoading}
            />

            <DocumentDataSourceFilter
              dataSources={jobs}
              dataSourceIds={dataSourceIds}
              onDataSourceIdsChange={(nextIds) => {
                setJobIds(nextIds);
                if (nextIds.length > 0) {
                  setDataSourceGroupId(null);
                }
              }}
              disabled={isInitialLoading}
            />

            <DocumentTermFilterSelect
              termFilterMode={termFilterMode}
              onTermFilterModeChange={(mode) => {
                setTermFilterMode(mode);
                if (mode !== "selected") {
                  setSelectedTerms([]);
                }
              }}
              disabled={isInitialLoading}
            />
          </div>

          {termFilterMode === "selected" ? (
            <DocumentTermPicker
              workspaceId={workspace.id}
              selectedTerms={selectedTerms}
              onSelectedTermsChange={setSelectedTerms}
              disabled={isInitialLoading}
            />
          ) : null}

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
                <Skeleton className={DOCUMENT_LIST_ITEM_SKELETON_CLASS} />
              </li>
            ))}
          </ul>
        ) : awaitingTermSelection ? (
          <ResourceListEmpty
            title="Choose terms to filter"
            description="Search and add one or more terms to see matching documents."
          />
        ) : showEmptyState ? (
          <ResourceListEmpty
            title={hasKeyword ? "No matching results" : DOCUMENT_CONFIG.emptyTitle}
            description={
              hasKeyword
                ? "Try a different search term or clear the filter."
                : termFilterMode === "none"
                  ? "No unassigned documents in the current filters."
                  : termFilterMode === "selected"
                    ? "No documents match the selected terms."
                    : "Documents appear here after a scrape dataSource ingests content."
            }
          />
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {hasKeyword
                ? `${filteredDocumentCount} matching of ${totalDocuments}`
                : `${totalDocuments} document${totalDocuments === 1 ? "" : "s"}`}
            </p>

            <DocumentGroupedList
              groups={documentListGroups}
              workspaceIndex={workspaceIndex}
              isFetchingMore={isFetchingMore}
            />

            <div ref={loadMoreRef} className="h-8" aria-hidden />
          </>
        )}
    </div>
  );
}
