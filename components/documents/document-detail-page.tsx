"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  LayersIcon,
  Loader2Icon,
  RefreshCwIcon,
  SparklesIcon,
  TagsIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import {
  classifyDocumentRequest,
  rebuildDocumentChunksRequest,
  refreshDocumentFromSourceRequest,
  scoreDocumentRequest,
} from "@/components/documents/document-action-request";
import { DocumentDetailCommentChunks } from "@/components/documents/document-detail-comment-chunks";
import { DocumentDetailComments } from "@/components/documents/document-detail-comments";
import { DocumentDetailChunks } from "@/components/documents/document-detail-chunks";
import {
  documentChunksQueryKey,
  documentQueryKey,
} from "@/components/documents/document-query-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  canRefreshFromSource,
  canUpdateComments,
  DOCUMENT_ACTION_LABELS,
  getRefreshFromSourceActionLabel,
} from "@/lib/documents/document-action-config";
import {
  DOCUMENT_CONFIG,
  getDocumentHref,
  getEmbeddingStatusBadge,
} from "@/lib/documents/document-config";
import type { ClassifyDocumentResult } from "@/lib/classification/types";
import type { GetDocumentResult } from "@/lib/documents/types";
import {
  getJobMenuConfigByJobType,
  getJobMenuHref,
} from "@/lib/jobs/job-menu-config";
import { isSchedulableJobType } from "@/lib/jobs/constants";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentDetailPageProps = {
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  documentId: string;
};

type DocumentAction = "refresh" | "score" | "classify" | "chunks";

async function fetchDocument(
  workspaceId: string,
  documentId: string,
): Promise<GetDocumentResult> {
  const res = await workspaceFetch(workspaceId, `/api/documents/${documentId}`);
  const data = (await res.json()) as GetDocumentResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load document.");
  }

  return data;
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "—";
  }

  return JSON.stringify(metadata, null, 2);
}

function resolveJobHref(
  workspaceIndex: number,
  document: GetDocumentResult,
): string | null {
  if (
    !document.jobId ||
    !document.jobType ||
    !isSchedulableJobType(document.jobType)
  ) {
    return null;
  }

  const menu = getJobMenuConfigByJobType(document.jobType);
  if (!menu) {
    return null;
  }

  return getJobMenuHref(workspaceIndex, menu, document.jobId);
}

function formatClassifyToast(result: ClassifyDocumentResult): {
  title: string;
  description?: string;
} {
  const names = [
    ...result.assignments.map((assignment) => assignment.name),
    ...result.createdTerms.map((term) => `${term.name} (new)`),
  ];

  if (names.length === 0) {
    return { title: "Classification completed with no term assignments." };
  }

  return {
    title: `Assigned ${names.length} term${names.length === 1 ? "" : "s"}`,
    description: names.join(", "),
  };
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className={
          mono
            ? "rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap"
            : "text-sm wrap-break-word whitespace-pre-wrap"
        }
      >
        {value}
      </div>
    </div>
  );
}

export function DocumentDetailPage({
  workspace,
  workspaceIndex,
  documentId,
}: DocumentDetailPageProps) {
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<DocumentAction | null>(null);

  const canEdit =
    workspace.permission === "edit" || workspace.permission === "owner";

  const documentQuery = useQuery({
    queryKey: documentQueryKey(workspace.id, documentId),
    queryFn: () => fetchDocument(workspace.id, documentId),
  });

  const document = documentQuery.data;
  const statusBadge = document
    ? getEmbeddingStatusBadge(document.embeddingStatus)
    : null;
  const jobHref = document ? resolveJobHref(workspaceIndex, document) : null;
  const title =
    document?.title?.trim() || document?.sourceId || "Document details";
  const refreshLabel = getRefreshFromSourceActionLabel(document?.jobType);
  const refreshEnabled = canRefreshFromSource(document?.jobType);
  const updateCommentsEnabled = canUpdateComments(document?.jobType);

  async function runAction(action: DocumentAction) {
    setPendingAction(action);

    try {
      switch (action) {
        case "refresh": {
          const result = await refreshDocumentFromSourceRequest(
            workspace.id,
            documentId,
          );
          toast.add({
            title: result.message,
            type: "success",
          });
          break;
        }
        case "score": {
          const result = await scoreDocumentRequest(workspace.id, documentId);
          toast.add({
            title: `Quality score updated to ${Math.round(result.qualityScore * 100)}%.`,
            type: "success",
          });
          break;
        }
        case "classify": {
          const result = await classifyDocumentRequest(workspace.id, documentId);
          const classifyToast = formatClassifyToast(result);
          toast.add({
            title: classifyToast.title,
            description: classifyToast.description,
            type: "success",
          });
          break;
        }
        case "chunks": {
          const result = await rebuildDocumentChunksRequest(
            workspace.id,
            documentId,
          );
          toast.add({
            title: `Search index rebuilt (${result.chunksCreated} chunk${result.chunksCreated === 1 ? "" : "s"}).`,
            type: "success",
          });
          break;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: documentQueryKey(workspace.id, documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentChunksQueryKey(workspace.id, documentId),
        }),
      ]);
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Action failed.",
        type: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }

  if (documentQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (documentQuery.error || !document) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
        <ResourceListEmpty
          title="Could not load document"
          description={documentQuery.error?.message ?? "Document not found."}
          actionLabel={`Back to ${DOCUMENT_CONFIG.listTitle.toLowerCase()}`}
          actionHref={getDocumentHref(workspaceIndex)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <div className="mb-6 space-y-4">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          render={<Link href={getDocumentHref(workspaceIndex)} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          {DOCUMENT_CONFIG.listTitle}
        </Button>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {statusBadge ? (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Ingested content with scoring, classification, and search indexing
            details.
          </p>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!refreshEnabled || pendingAction !== null}
              onClick={() => void runAction("refresh")}
            >
              {pendingAction === "refresh" ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              {pendingAction === "refresh" ? "Fetching…" : refreshLabel}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => void runAction("score")}
            >
              {pendingAction === "score" ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              {pendingAction === "score" ? "Scoring…" : DOCUMENT_ACTION_LABELS.score}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => void runAction("classify")}
            >
              {pendingAction === "classify" ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <TagsIcon data-icon="inline-start" />
              )}
              {pendingAction === "classify"
                ? "Classifying…"
                : DOCUMENT_ACTION_LABELS.classify}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingAction !== null}
              onClick={() => void runAction("chunks")}
            >
              {pendingAction === "chunks" ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <LayersIcon data-icon="inline-start" />
              )}
              {pendingAction === "chunks"
                ? "Indexing…"
                : DOCUMENT_ACTION_LABELS.chunks}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
        <DetailField label="Document type" value={document.docType} />
        <DetailField label="Source key" value={document.sourceKey} mono />
        <DetailField label="Source name" value={document.sourceName} />
        <DetailField label="Source ID" value={document.sourceId} mono />

        <DetailField
          label="Job run"
          value={
            document.jobRunId ? (
              <>
                <span>{document.jobRunId}</span>
                {document.jobName ? (
                  <p className="mt-1 font-sans text-sm text-muted-foreground">
                    Created by{" "}
                    {jobHref ? (
                      <Link
                        href={jobHref}
                        className="text-foreground underline underline-offset-2"
                      >
                        {document.jobName}
                      </Link>
                    ) : (
                      document.jobName
                    )}
                  </p>
                ) : null}
              </>
            ) : (
              "Created manually"
            )
          }
          mono
        />

        {document.title ? (
          <DetailField label="Title" value={document.title} />
        ) : null}

        <DetailField
          label="Published at"
          value={formatDateTime(document.publishedAt)}
        />
        <DetailField
          label="Created at"
          value={formatDateTime(document.createdAt)}
        />
        <DetailField label="Content" value={document.rawContent} />
        <DetailField
          label="Metadata"
          value={formatMetadata(document.metadata)}
          mono
        />

        {document.qualityScore != null ? (
          <DetailField
            label="Quality score"
            value={`${Math.round(document.qualityScore * 100)}%`}
          />
        ) : null}

        <DetailField
          label="Engagement"
          value={`${document.likeCount} likes · ${document.commentCount} comments · ${document.shareCount} shares · ${document.viewCount} views`}
        />
      </div>

      <DocumentDetailComments
        workspaceId={workspace.id}
        documentId={documentId}
        canEdit={canEdit}
        updateEnabled={updateCommentsEnabled}
      />

      <DocumentDetailCommentChunks
        workspaceId={workspace.id}
        documentId={documentId}
        canEdit={canEdit}
        updateEnabled={updateCommentsEnabled}
      />

      <DocumentDetailChunks
        workspaceId={workspace.id}
        documentId={documentId}
        embeddingStatus={document.embeddingStatus}
      />
    </div>
  );
}
