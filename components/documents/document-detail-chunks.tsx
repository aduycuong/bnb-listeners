"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  ImageIcon,
  Loader2Icon,
  SearchIcon,
  TypeIcon,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import {
  documentChunkSearchQueryKey,
  documentChunksQueryKey,
} from "@/components/documents/document-query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type {
  DocumentChunkListItem,
  ListDocumentChunksResult,
  SearchDocumentChunksResult,
} from "@/lib/chunking/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentDetailChunksProps = {
  workspaceId: string;
  documentId: string;
  embeddingStatus: string;
};

async function fetchDocumentChunks(
  workspaceId: string,
  documentId: string,
): Promise<ListDocumentChunksResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/chunks`,
  );
  const data = (await res.json()) as ListDocumentChunksResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load chunks.");
  }

  return data;
}

async function fetchDocumentChunkSearch(
  workspaceId: string,
  documentId: string,
  query: string,
): Promise<SearchDocumentChunksResult> {
  const params = new URLSearchParams({ q: query });
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/chunks/search?${params.toString()}`,
  );
  const data = (await res.json()) as SearchDocumentChunksResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not search chunks.");
  }

  return data;
}

function getContentTypeBadge(contentType: string) {
  switch (contentType) {
    case "image":
      return {
        label: "Image",
        className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        icon: ImageIcon,
      };
    case "video":
      return {
        label: "Video",
        className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
        icon: VideoIcon,
      };
    default:
      return {
        label: "Text",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        icon: TypeIcon,
      };
  }
}

function formatChunkPart(metadata: Record<string, unknown>) {
  const partIndex = metadata.partIndex;
  const splitIndex = metadata.splitIndex;
  const splitCount = metadata.splitCount;

  if (typeof partIndex !== "number") {
    return null;
  }

  if (
    typeof splitIndex === "number" &&
    typeof splitCount === "number" &&
    splitCount > 1
  ) {
    return `Part ${partIndex} · piece ${splitIndex + 1} of ${splitCount}`;
  }

  return `Part ${partIndex}`;
}

function getEmptyDescription(embeddingStatus: string) {
  switch (embeddingStatus) {
    case "pending":
      return "This document has not been indexed yet.";
    case "rejected":
      return "No part of this document scored high enough on relevance and detail to be indexed.";
    case "skipped":
      return "Indexing was skipped because quality was below the threshold.";
    case "failed":
      return "Indexing failed. Use Rebuild search index to try again.";
    default:
      return "No chunks were created for this document.";
  }
}

function CopyChunkIdButton({ chunkId }: { chunkId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyChunkId() {
    try {
      await navigator.clipboard.writeText(chunkId);
      setCopied(true);
      toast.add({
        title: "Chunk ID copied.",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        title: "Could not copy chunk ID.",
        type: "error",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copy chunk ID"
      onClick={() => void copyChunkId()}
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-green-600" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </Button>
  );
}

function ChunkScoreItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ChunkSearchScoresBar({
  rank,
  similarityScore,
  multimodalSimilarityScore,
  ftsScore,
  rrfScore,
  qualityScore,
}: {
  rank: number;
  similarityScore: number;
  multimodalSimilarityScore: number | null;
  ftsScore: number | null;
  rrfScore: number;
  qualityScore: number;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
      <span className="text-sm font-semibold text-primary">#{rank}</span>
      <ChunkScoreItem label="Text sim." value={similarityScore.toFixed(3)} />
      {multimodalSimilarityScore !== null ? (
        <ChunkScoreItem
          label="MM sim."
          value={multimodalSimilarityScore.toFixed(3)}
        />
      ) : null}
      {ftsScore !== null ? (
        <ChunkScoreItem label="FTS" value={ftsScore.toFixed(4)} />
      ) : (
        <ChunkScoreItem label="FTS" value="—" />
      )}
      <ChunkScoreItem label="RRF" value={rrfScore.toFixed(4)} />
      <ChunkScoreItem label="Quality" value={qualityScore.toFixed(2)} />
    </div>
  );
}

function resolveSearchResultChunk(
  searchItem: SearchDocumentChunksResult["items"][number],
  allChunks: DocumentChunkListItem[],
): DocumentChunkListItem {
  const fullChunk = allChunks.find((chunk) => chunk.id === searchItem.id);
  if (fullChunk) {
    return fullChunk;
  }

  return {
    id: searchItem.id,
    partId: null,
    chunkIndex: searchItem.chunkIndex,
    content: searchItem.content,
    contentType: "text",
    mediaUrl: null,
    metadata: {},
    mediaMetadata: null,
    createdAt: "",
  };
}

function ChunkCard({ chunk }: { chunk: DocumentChunkListItem }) {
  const badge = getContentTypeBadge(chunk.contentType);
  const BadgeIcon = badge.icon;
  const partLabel = formatChunkPart(chunk.metadata);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          #{chunk.chunkIndex + 1}
        </span>
        <CopyChunkIdButton chunkId={chunk.id} />
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            badge.className,
          )}
        >
          <BadgeIcon className="size-3" />
          {badge.label}
        </span>
        {partLabel ? (
          <span className="text-[11px] text-muted-foreground">{partLabel}</span>
        ) : null}
      </div>

      <p className="text-sm wrap-break-word whitespace-pre-wrap">
        {chunk.content.trim()}
      </p>

      {chunk.mediaUrl ? (
        <a
          href={chunk.mediaUrl}
          target="_blank"
          rel="noreferrer noopener"
          title={chunk.mediaUrl}
          className="mt-2 block max-w-full break-all text-xs text-primary underline-offset-4 hover:underline"
        >
          {chunk.mediaUrl}
        </a>
      ) : null}
    </>
  );
}

function SearchResultChunkCard({
  chunk,
  rank,
  similarityScore,
  multimodalSimilarityScore,
  ftsScore,
  rrfScore,
  qualityScore,
}: {
  chunk: DocumentChunkListItem;
  rank: number;
  similarityScore: number;
  multimodalSimilarityScore: number | null;
  ftsScore: number | null;
  rrfScore: number;
  qualityScore: number;
}) {
  return (
    <li className="min-w-0 rounded-xl border bg-card px-4 py-3">
      <ChunkSearchScoresBar
        rank={rank}
        similarityScore={similarityScore}
        multimodalSimilarityScore={multimodalSimilarityScore}
        ftsScore={ftsScore}
        rrfScore={rrfScore}
        qualityScore={qualityScore}
      />
      <ChunkCard chunk={chunk} />
    </li>
  );
}

export function DocumentDetailChunks({
  workspaceId,
  documentId,
  embeddingStatus,
}: DocumentDetailChunksProps) {
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const chunksQuery = useQuery({
    queryKey: documentChunksQueryKey(workspaceId, documentId),
    queryFn: () => fetchDocumentChunks(workspaceId, documentId),
  });

  const searchQuery = useQuery({
    queryKey: documentChunkSearchQueryKey(
      workspaceId,
      documentId,
      submittedQuery,
    ),
    queryFn: () =>
      fetchDocumentChunkSearch(workspaceId, documentId, submittedQuery),
    enabled: submittedQuery.length > 0,
  });

  const items = chunksQuery.data?.items ?? [];
  const isLoading = chunksQuery.isLoading;
  const errorMessage = chunksQuery.error?.message;
  const searchResults = searchQuery.data?.items ?? [];
  const hasSubmittedQuery = submittedQuery.length > 0;

  function submitSearch() {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setSubmittedQuery("");
      return;
    }

    setSubmittedQuery(trimmed);
  }

  function clearSearch() {
    setSearchInput("");
    setSubmittedQuery("");
  }

  const canClearSearch =
    hasSubmittedQuery || searchInput.trim().length > 0;

  return (
    <section className="mt-8 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Chunks</h2>
        <p className="text-sm text-muted-foreground">
          Text and media segments embedded for retrieval and search.
        </p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Check similarity score..."
            className="pl-8"
            aria-label="Check similarity score"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="secondary"
            disabled={searchQuery.isFetching && hasSubmittedQuery}
          >
            {searchQuery.isFetching && hasSubmittedQuery ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Testing
              </>
            ) : (
              "Test"
            )}
          </Button>
          {canClearSearch ? (
            <Button
              type="button"
              variant="outline"
              onClick={clearSearch}
              disabled={searchQuery.isFetching}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      {hasSubmittedQuery ? (
        searchQuery.error ? (
          <ResourceListEmpty
            title="Test failed"
            description={searchQuery.error.message}
          />
        ) : searchQuery.isLoading ? (
          <ul className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="h-28 w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : searchResults.length === 0 ? (
          <ResourceListEmpty
            title="No chunks to score"
            description={`No indexed chunks available to score against "${submittedQuery}".`}
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Similarity scores for &ldquo;{submittedQuery}&rdquo; —{" "}
              {searchResults.length} chunk
              {searchResults.length === 1 ? "" : "s"} ranked
            </p>
            <ul className="flex flex-col gap-2.5">
              {searchResults.map((searchItem, index) => (
                <SearchResultChunkCard
                  key={searchItem.id}
                  chunk={resolveSearchResultChunk(searchItem, items)}
                  rank={index + 1}
                  similarityScore={searchItem.similarityScore}
                  multimodalSimilarityScore={searchItem.multimodalSimilarityScore}
                  ftsScore={searchItem.ftsScore}
                  rrfScore={searchItem.rrfScore}
                  qualityScore={searchItem.qualityScore}
                />
              ))}
            </ul>
          </>
        )
      ) : null}

      {!hasSubmittedQuery ? (
        errorMessage ? (
          <ResourceListEmpty
            title="Could not load chunks"
            description={errorMessage}
          />
        ) : isLoading ? (
          <ul className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index}>
                <Skeleton className="h-24 w-full rounded-xl" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <ResourceListEmpty
            title="No chunks yet"
            description={getEmptyDescription(embeddingStatus)}
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {items.length} chunk{items.length === 1 ? "" : "s"}
            </p>

            <ul className="flex flex-col gap-2.5">
              {items.map((chunk) => (
                <li
                  key={chunk.id}
                  className="min-w-0 rounded-xl border bg-card px-4 py-3"
                >
                  <ChunkCard chunk={chunk} />
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}
    </section>
  );
}
