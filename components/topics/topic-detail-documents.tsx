"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { DocumentJobSourceFilter } from "@/components/documents/document-job-source-filter";
import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { TopicDocumentRow } from "@/components/topics/topic-document-row";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TOPIC_CONFIG } from "@/lib/topics/topic-config";
import type { TopicDocumentListItem } from "@/lib/topics/types";
import type { JobListItem } from "@/lib/jobs/types";

type TopicDetailDocumentsProps = {
  documents: TopicDocumentListItem[];
  jobs: JobListItem[];
  jobIds: string[];
  search: string;
  totalLoaded: number;
  isInitialLoading: boolean;
  isFetchingMore: boolean;
  errorMessage?: string;
  hasNextPage: boolean;
  onJobIdsChange: (jobIds: string[]) => void;
  onSearchChange: (search: string) => void;
  onLoadMore: () => void;
  onDocumentClick: (documentId: string) => void;
};

export function TopicDetailDocuments({
  documents,
  jobs,
  jobIds,
  search,
  totalLoaded,
  isInitialLoading,
  isFetchingMore,
  errorMessage,
  hasNextPage,
  onJobIdsChange,
  onSearchChange,
  onLoadMore,
  onDocumentClick,
}: TopicDetailDocumentsProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasSearch = search.trim().length > 0;
  const showEmptyState =
    !isInitialLoading && !errorMessage && documents.length === 0;

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
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {TOPIC_CONFIG.detailDocumentsTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {TOPIC_CONFIG.detailDocumentsDescription}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <DocumentJobSourceFilter
          jobs={jobs}
          jobIds={jobIds}
          onJobIdsChange={onJobIdsChange}
          disabled={isInitialLoading}
        />

        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search documents..."
            className="pl-8"
            aria-label="Search topic documents"
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
              <Skeleton className="h-16 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : showEmptyState ? (
        <ResourceListEmpty
          title={
            hasSearch
              ? TOPIC_CONFIG.detailDocumentsSearchEmptyTitle
              : TOPIC_CONFIG.detailDocumentsEmptyTitle
          }
          description={
            hasSearch
              ? TOPIC_CONFIG.detailDocumentsSearchEmptyDescription
              : TOPIC_CONFIG.detailDocumentsEmptyDescription
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {totalLoaded} document{totalLoaded === 1 ? "" : "s"} loaded
          </p>

          <ul className="flex flex-col gap-2.5">
            {documents.map((document) => (
              <li key={document.id}>
                <TopicDocumentRow
                  document={document}
                  onClick={() => onDocumentClick(document.id)}
                />
              </li>
            ))}

            {isFetchingMore
              ? Array.from({ length: 2 }).map((_, index) => (
                  <li key={`loading-${index}`}>
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </li>
                ))
              : null}
          </ul>

          <div ref={loadMoreRef} className="h-8" aria-hidden />
        </>
      )}
    </section>
  );
}
