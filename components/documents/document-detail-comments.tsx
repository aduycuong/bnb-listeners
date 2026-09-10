"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
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
import { DOCUMENT_ACTION_LABELS } from "@/lib/documents/document-action-config";
import type { CommentListItem, ListDocumentCommentsResult } from "@/lib/comments/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentDetailCommentsProps = {
  workspaceId: string;
  documentId: string;
  canEdit: boolean;
  updateEnabled: boolean;
};

async function fetchDocumentComments(
  workspaceId: string,
  documentId: string,
): Promise<ListDocumentCommentsResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/comments`,
  );
  const data = (await res.json()) as ListDocumentCommentsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load comments.");
  }

  return data;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRoleBadge(role: string | null) {
  switch (role) {
    case "debate":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "answer":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "info":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "other":
      return "bg-muted text-muted-foreground";
    default:
      return null;
  }
}

function getStanceBadge(stance: string | null) {
  switch (stance) {
    case "agree":
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "disagree":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "neutral":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-400";
    default:
      return null;
  }
}

function truncateContent(content: string, maxLength = 320) {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function CommentCard({ comment }: { comment: CommentListItem }) {
  const roleClassName = getRoleBadge(comment.role);
  const stanceClassName = getStanceBadge(comment.stance);
  const publishedLabel = formatDateTime(comment.publishedAt);

  return (
    <li className="min-w-0 rounded-xl border bg-card px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {comment.authorName?.trim() || "Anonymous"}
        </span>
        {publishedLabel ? (
          <span className="text-[11px] text-muted-foreground">
            {publishedLabel}
          </span>
        ) : null}
        {comment.likeCount > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {comment.likeCount} like{comment.likeCount === 1 ? "" : "s"}
          </span>
        ) : null}
        {roleClassName && comment.role ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
              roleClassName,
            )}
          >
            {comment.role}
          </span>
        ) : null}
        {stanceClassName && comment.stance ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
              stanceClassName,
            )}
          >
            {comment.stance}
          </span>
        ) : null}
        {comment.isSubstantive ? (
          <span className="inline-flex rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-400">
            substantive
          </span>
        ) : null}
        {!comment.scoredAt ? (
          <span className="text-[11px] text-muted-foreground">unscored</span>
        ) : null}
      </div>

      <p className="text-sm whitespace-pre-wrap">
        {truncateContent(comment.content)}
      </p>
    </li>
  );
}

export function DocumentDetailComments({
  workspaceId,
  documentId,
  canEdit,
  updateEnabled,
}: DocumentDetailCommentsProps) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const commentsQuery = useQuery({
    queryKey: documentCommentsQueryKey(workspaceId, documentId),
    queryFn: () => fetchDocumentComments(workspaceId, documentId),
  });

  const items = commentsQuery.data?.items ?? [];
  const isLoading = commentsQuery.isLoading;
  const errorMessage = commentsQuery.error?.message;

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
          <h2 className="text-lg font-semibold tracking-tight">Comments</h2>
          <p className="text-sm text-muted-foreground">
            Facebook comments fetched from the post source and scored for debate
            signals.
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
          title="Could not load comments"
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
          title="No comments yet"
          description={
            updateEnabled
              ? "Use Update comments to fetch comments from Facebook."
              : "This document does not support comment fetching."
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {items.length} comment{items.length === 1 ? "" : "s"}
          </p>

          <ul className="flex flex-col gap-2.5">
            {items.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
