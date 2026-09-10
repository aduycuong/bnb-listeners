"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, RefreshCwIcon, TypeIcon } from "lucide-react";
import { useState } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { updateDocumentCommentsRequest } from "@/components/documents/document-action-request";
import {
  documentCommentChunksQueryKey,
  documentCommentsQueryKey,
  documentQueryKey,
} from "@/components/documents/document-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import type { DocumentChunkListItem } from "@/lib/chunking/types";
import type { ListDocumentCommentChunksResult } from "@/lib/comments/types";
import { DOCUMENT_ACTION_LABELS } from "@/lib/documents/document-action-config";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentDetailCommentChunksProps = {
  workspaceId: string;
  documentId: string;
  canEdit: boolean;
  updateEnabled: boolean;
};

async function fetchDocumentCommentChunks(
  workspaceId: string,
  documentId: string,
): Promise<ListDocumentCommentChunksResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/comment-chunks`,
  );
  const data = (await res.json()) as ListDocumentCommentChunksResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      data.message ?? data.error ?? "Could not load comment chunks.",
    );
  }

  return data;
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

function getEmptyDescription(
  embeddingStatus: string | null,
  hasDiscussionDocument: boolean,
) {
  if (!hasDiscussionDocument) {
    return "Substantive comments are indexed into a discussion document after scoring.";
  }

  switch (embeddingStatus) {
    case "pending":
      return "The discussion document has not been indexed yet.";
    case "skipped":
      return "Discussion indexing was skipped because quality was below the threshold.";
    case "failed":
      return "Discussion indexing failed. Rebuild search index on the discussion document to retry.";
    default:
      return "No comment chunks were created yet.";
  }
}

function CommentChunkCard({ chunk }: { chunk: DocumentChunkListItem }) {
  const partLabel = formatChunkPart(chunk.metadata);

  return (
    <li className="min-w-0 rounded-xl border bg-card px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          #{chunk.chunkIndex + 1}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <TypeIcon className="size-3" />
          Text
        </span>
        {partLabel ? (
          <span className="text-[11px] text-muted-foreground">{partLabel}</span>
        ) : null}
        {chunk.topicIds && chunk.topicIds.length > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {chunk.topicIds.length} topic
            {chunk.topicIds.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <p className="text-sm whitespace-pre-wrap">
        {truncateContent(chunk.content)}
      </p>
    </li>
  );
}

export function DocumentDetailCommentChunks({
  workspaceId,
  documentId,
  canEdit,
  updateEnabled,
}: DocumentDetailCommentChunksProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const chunksQuery = useQuery({
    queryKey: documentCommentChunksQueryKey(workspaceId, documentId),
    queryFn: () => fetchDocumentCommentChunks(workspaceId, documentId),
  });

  const items = chunksQuery.data?.items ?? [];
  const embeddingStatus = chunksQuery.data?.embeddingStatus ?? null;
  const hasDiscussionDocument = Boolean(chunksQuery.data?.discussionDocumentId);
  const isLoading = chunksQuery.isLoading;
  const errorMessage = chunksQuery.error?.message;

  async function handleUpdateComments() {
    setIsUpdating(true);

    try {
      const result = await updateDocumentCommentsRequest(workspaceId, documentId);
      toast.add({
        title: result.message,
        type: "success",
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: documentQueryKey(workspaceId, documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentCommentsQueryKey(workspaceId, documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentCommentChunksQueryKey(workspaceId, documentId),
        }),
      ]);
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Could not update comments.",
        type: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Comment search index chunks
          </h2>
          <p className="text-sm text-muted-foreground">
            Substantive comments rolled into the discussion document for
            retrieval and search.
          </p>
        </div>

        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!updateEnabled || isUpdating}
            onClick={() => void handleUpdateComments()}
          >
            {isUpdating ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            {isUpdating ? "Fetching…" : DOCUMENT_ACTION_LABELS.updateComments}
          </Button>
        ) : null}
      </div>

      {errorMessage ? (
        <ResourceListEmpty
          title="Could not load comment chunks"
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
          title="No comment chunks yet"
          description={getEmptyDescription(embeddingStatus, hasDiscussionDocument)}
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {items.length} chunk{items.length === 1 ? "" : "s"}
          </p>

          <ul className="flex flex-col gap-2.5">
            {items.map((chunk) => (
              <CommentChunkCard key={chunk.id} chunk={chunk} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
