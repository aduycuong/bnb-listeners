"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";

import { documentQueryKey } from "@/components/documents/document-query-keys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDocumentHref,
  getEmbeddingStatusBadge,
} from "@/lib/documents/document-config";
import type { GetDocumentResult } from "@/lib/documents/types";
import {
  getJobMenuConfigByJobType,
  getJobMenuHref,
} from "@/lib/jobs/job-menu-config";
import { isSchedulableJobType } from "@/lib/jobs/constants";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceIndex: number;
  documentId: string | null;
};

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

export function DocumentDetailDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceIndex,
  documentId,
}: DocumentDetailDialogProps) {
  const { data: document, isLoading, error } = useQuery({
    queryKey: documentQueryKey(workspaceId, documentId ?? ""),
    queryFn: () => fetchDocument(workspaceId, documentId!),
    enabled: open && Boolean(documentId),
  });

  const statusBadge = document
    ? getEmbeddingStatusBadge(document.embeddingStatus)
    : null;
  const jobHref = document ? resolveJobHref(workspaceIndex, document) : null;
  const title =
    document?.title?.trim() || document?.sourceId || "Document details";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <DialogTitle>{isLoading ? "Loading document…" : title}</DialogTitle>
            {statusBadge ? (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}
              >
                {statusBadge.label}
              </span>
            ) : null}
          </div>
          <DialogDescription>
            Read-only view for documents created by a job run.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : document ? (
          <div className="space-y-4">
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
