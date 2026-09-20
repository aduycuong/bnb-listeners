"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { DocumentDataSourceFilter } from "@/components/documents/document-data-source-filter";
import { DocumentGroupedList } from "@/components/documents/document-grouped-list";
import { DOCUMENT_LIST_ITEM_SKELETON_CLASS } from "@/components/documents/document-list-item-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toDocumentCardItemFromTermDocument } from "@/lib/documents/utils/to-document-card-item";
import { groupDocumentCardItemsInOrder } from "@/lib/documents/utils/order-document-list-by-parent";
import { TERM_CONFIG } from "@/lib/terms/term-config";
import type { TermDocumentListItem } from "@/lib/terms/types";
import type { DataSourceListItem } from "@/lib/data-sources/types";

type TermDetailDocumentsProps = {
  documents: TermDocumentListItem[];
  jobs: DataSourceListItem[];
  dataSourceIds: string[];
  search: string;
  totalLoaded: number;
  workspaceIndex: number;
  isInitialLoading: boolean;
  isFetchingMore: boolean;
  errorMessage?: string;
  hasNextPage: boolean;
  onJobIdsChange: (dataSourceIds: string[]) => void;
  onSearchChange: (search: string) => void;
  onLoadMore: () => void;
};

export function TermDetailDocuments({
  documents,
  jobs,
  dataSourceIds,
  search,
  totalLoaded,
  workspaceIndex,
  isInitialLoading,
  isFetchingMore,
  errorMessage,
  hasNextPage,
  onJobIdsChange,
  onSearchChange,
  onLoadMore,
}: TermDetailDocumentsProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasSearch = search.trim().length > 0;
  const showEmptyState =
    !isInitialLoading && !errorMessage && documents.length === 0;

  const cardItems = useMemo(
    () => documents.map(toDocumentCardItemFromTermDocument),
    [documents],
  );

  const documentGroups = useMemo(
    () => groupDocumentCardItemsInOrder(cardItems),
    [cardItems],
  );

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage || isFetchingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingMore, onLoadMore]);

  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {TERM_CONFIG.detailDocumentsTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {TERM_CONFIG.detailDocumentsDescription}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-center">
        <div className="min-w-0">
          <DocumentDataSourceFilter
            dataSources={jobs}
            dataSourceIds={dataSourceIds}
            onDataSourceIdsChange={onJobIdsChange}
            disabled={isInitialLoading}
          />
        </div>

        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search documents..."
            className="pl-8"
            aria-label="Search term documents"
            disabled={isInitialLoading}
          />
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
      ) : showEmptyState ? (
        <ResourceListEmpty
          title={
            hasSearch
              ? TERM_CONFIG.detailDocumentsSearchEmptyTitle
              : TERM_CONFIG.detailDocumentsEmptyTitle
          }
          description={
            hasSearch
              ? TERM_CONFIG.detailDocumentsSearchEmptyDescription
              : TERM_CONFIG.detailDocumentsEmptyDescription
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {totalLoaded} document{totalLoaded === 1 ? "" : "s"} loaded
          </p>

          <DocumentGroupedList
            groups={documentGroups}
            workspaceIndex={workspaceIndex}
            isFetchingMore={isFetchingMore}
          />

          <div ref={loadMoreRef} className="h-8" aria-hidden />
        </>
      )}
    </section>
  );
}
