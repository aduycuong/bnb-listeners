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
import { DocumentDetailChunks } from "@/components/documents/document-detail-chunks";
import { DocumentDetailParts } from "@/components/documents/document-detail-parts";
import { DocumentTypeBadge } from "@/components/documents/document-type-badge";
import {
  documentChunksQueryKey,
  documentPartsQueryKey,
  documentQueryKey,
} from "@/components/documents/document-query-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  canRefreshFromSource,
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
  ANONYMOUS_AUTHOR_LABEL,
  buildDocumentHeading,
} from "@/lib/documents/utils/build-document-heading";
import {
  getDataSourceMenuConfigByJobType,
  getDataSourceMenuHref,
} from "@/lib/data-sources/data-source-menu-config";
import { isSourceType } from "@/lib/data-sources/constants";
import { getDocumentTermAssignedByLabel } from "@/lib/document-terms/document-term-config";
import { getTermHref } from "@/lib/terms/term-config";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";
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
    !document.dataSourceId ||
    !document.sourceType ||
    !isSourceType(document.sourceType)
  ) {
    return null;
  }

  const menu = getDataSourceMenuConfigByJobType(document.sourceType);
  if (!menu) {
    return null;
  }

  return getDataSourceMenuHref(workspaceIndex, menu, document.dataSourceId);
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

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-start sm:gap-8">
      <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-sm font-medium wrap-break-word whitespace-pre-wrap",
          mono && "font-mono text-xs break-all",
        )}
      >
        {value}
      </dd>
    </div>
  );
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

function pageContainerClassName() {
  return "mx-auto w-full max-w-7xl px-4 py-8 md:px-8";
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
  const title = document ? buildDocumentHeading(document) : "Document details";
  const refreshLabel = getRefreshFromSourceActionLabel(document?.sourceType);
  const refreshEnabled = canRefreshFromSource(document?.sourceType);

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
            description: `${result.eligibleCount} of ${result.parts.length} part${result.parts.length === 1 ? "" : "s"} eligible for indexing.`,
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
        queryClient.invalidateQueries({
          queryKey: documentPartsQueryKey(workspace.id, documentId),
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
      <div className={`${pageContainerClassName()} space-y-6`}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (documentQuery.error || !document) {
    return (
      <div className={pageContainerClassName()}>
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
    <div className={`${pageContainerClassName()} space-y-8`}>
      <div className="space-y-4">
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
            <DocumentTypeBadge docType={document.docType} />
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="divide-y">
            <section className="pb-6">
              <dl className="divide-y divide-border">
                <DetailRow
                  label="Document type"
                  value={<DocumentTypeBadge docType={document.docType} />}
                />
                <DetailRow
                  label="Source key"
                  value={document.sourceOriginKey}
                  mono
                />
                <DetailRow label="Source name" value={document.sourceOriginName} />
                <DetailRow label="Source ID" value={document.sourceItemId} mono />
                <DetailRow
                  label="Job run"
                  value={
                    document.sourceRunId ? (
                      <>
                        <span>{document.sourceRunId}</span>
                        {document.dataSourceName ? (
                          <p className="mt-1 font-sans text-xs font-normal text-muted-foreground">
                            Created by{" "}
                            {jobHref ? (
                              <Link
                                href={jobHref}
                                className="text-foreground underline underline-offset-2"
                              >
                                {document.dataSourceName}
                              </Link>
                            ) : (
                              document.dataSourceName
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
                <DetailRow
                  label="Author"
                  value={document.authorName?.trim() || ANONYMOUS_AUTHOR_LABEL}
                />
                {document.title ? (
                  <DetailRow label="Title" value={document.title} />
                ) : null}
                <DetailRow
                  label="Published at"
                  value={formatDateTime(document.publishedAt)}
                />
                <DetailRow
                  label="Created at"
                  value={formatDateTime(document.createdAt)}
                />
              </dl>
            </section>

            <section className="space-y-3 py-6">
              <h3 className="text-sm font-medium">Terms attached</h3>
              {document.terms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No terms assigned yet. Use Classify to match this document to
                  workspace terms.
                </p>
              ) : (
                <ul className="space-y-2">
                  {document.terms.map((term) => (
                    <li
                      key={term.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1"
                    >
                      <Link
                        href={getTermHref(workspaceIndex, term.id)}
                        className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900 transition-colors hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                      >
                        {term.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        assigned by{" "}
                        {getDocumentTermAssignedByLabel(term.assignedBy ?? "unknown")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 py-6">
              <h3 className="text-sm font-medium">Info score</h3>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Quality score
                </p>
                <p className="text-3xl font-semibold tracking-tight">
                  {document.qualityScore != null
                    ? `${Math.round(document.qualityScore * 100)}%`
                    : "—"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Highest part score among the parts that passed both the
                relevance and detail thresholds. See Parts below for the
                per-part breakdown.
              </p>
            </section>

            <section className="space-y-3 pt-6">
              <h3 className="text-sm font-medium">Actions</h3>
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
                    {pendingAction === "score"
                      ? "Scoring…"
                      : DOCUMENT_ACTION_LABELS.score}
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  You need edit access to run document actions.
                </p>
              )}
            </section>
          </div>

          {document.discussionDocumentId || document.parentDocumentId ? (
            <div className="flex flex-wrap gap-4 border-t pt-4">
              {document.discussionDocumentId ? (
                <Link
                  href={getDocumentHref(workspaceIndex, document.discussionDocumentId)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View discussion document
                </Link>
              ) : null}
              {document.parentDocumentId ? (
                <Link
                  href={getDocumentHref(workspaceIndex, document.parentDocumentId)}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View parent document
                </Link>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content & engagement</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4 space-y-4">
              <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm whitespace-pre-wrap">
                {document.rawContent.trim() || "—"}
              </div>
              <DetailField
                label="Engagement"
                value={`${document.likeCount} likes · ${document.commentCount} comments · ${document.shareCount} shares · ${document.viewCount} views`}
              />
            </TabsContent>

            <TabsContent value="metadata" className="mt-4">
              <DetailField
                label="Metadata"
                value={formatMetadata(document.metadata)}
                mono
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DocumentDetailParts workspaceId={workspace.id} documentId={documentId} />

      <DocumentDetailChunks
        workspaceId={workspace.id}
        documentId={documentId}
        embeddingStatus={document.embeddingStatus}
      />
    </div>
  );
}
