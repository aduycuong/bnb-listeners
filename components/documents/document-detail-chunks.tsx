"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageIcon, TypeIcon, VideoIcon } from "lucide-react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { documentChunksQueryKey } from "@/components/documents/document-query-keys";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListDocumentChunksResult } from "@/lib/chunking/types";
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
  const partCount = metadata.partCount;

  if (typeof partIndex === "number" && typeof partCount === "number") {
    return `Part ${partIndex + 1} of ${partCount}`;
  }

  return null;
}

function truncateContent(content: string, maxLength = 280) {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function getEmptyDescription(embeddingStatus: string) {
  switch (embeddingStatus) {
    case "pending":
      return "This document has not been indexed yet.";
    case "skipped":
      return "Indexing was skipped because quality was below the threshold.";
    case "failed":
      return "Indexing failed. Use Rebuild search index to try again.";
    default:
      return "No chunks were created for this document.";
  }
}

export function DocumentDetailChunks({
  workspaceId,
  documentId,
  embeddingStatus,
}: DocumentDetailChunksProps) {
  const chunksQuery = useQuery({
    queryKey: documentChunksQueryKey(workspaceId, documentId),
    queryFn: () => fetchDocumentChunks(workspaceId, documentId),
  });

  const items = chunksQuery.data?.items ?? [];
  const isLoading = chunksQuery.isLoading;
  const errorMessage = chunksQuery.error?.message;

  return (
    <section className="mt-8 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Search index chunks</h2>
        <p className="text-sm text-muted-foreground">
          Text and media segments embedded for retrieval and search.
        </p>
      </div>

      {errorMessage ? (
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
            {items.map((chunk) => {
              const badge = getContentTypeBadge(chunk.contentType);
              const BadgeIcon = badge.icon;
              const partLabel = formatChunkPart(chunk.metadata);

              return (
                <li
                  key={chunk.id}
                  className="min-w-0 rounded-xl border bg-card px-4 py-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{chunk.chunkIndex + 1}
                    </span>
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
                      <span className="text-[11px] text-muted-foreground">
                        {partLabel}
                      </span>
                    ) : null}
                    {chunk.termIds && chunk.termIds.length > 0 ? (
                      <span className="text-[11px] text-muted-foreground">
                        {chunk.termIds.length} term
                        {chunk.termIds.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm whitespace-pre-wrap">
                    {truncateContent(chunk.content)}
                  </p>

                  {chunk.mediaUrl ? (
                    <a
                      href={chunk.mediaUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={chunk.mediaUrl}
                      className="mt-2 block max-w-full truncate text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {chunk.mediaUrl}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
