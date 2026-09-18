"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ImageIcon,
  MinusCircleIcon,
  TypeIcon,
  VideoIcon,
  XCircleIcon,
} from "lucide-react";

import { ResourceListEmpty } from "@/components/dashboard/resource-list-empty";
import { documentPartsQueryKey } from "@/components/documents/document-query-keys";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DocumentPartListItem,
  ListDocumentPartsResult,
} from "@/lib/document-parts/types";
import { PART_DETAIL_MIN, PART_RELEVANCE_MIN } from "@/lib/scoring/config";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DocumentDetailPartsProps = {
  workspaceId: string;
  documentId: string;
};

async function fetchDocumentParts(
  workspaceId: string,
  documentId: string,
): Promise<ListDocumentPartsResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/parts`,
  );
  const data = (await res.json()) as ListDocumentPartsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load parts.");
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

function getEligibilityBadge(part: DocumentPartListItem) {
  if (part.scoreSource === "failed") {
    return {
      label: "Failed",
      className: "bg-red-500/10 text-red-700 dark:text-red-400",
      icon: AlertTriangleIcon,
    };
  }

  if (part.scoreSource === "placeholder") {
    return {
      label: "Not scored",
      className: "bg-muted text-muted-foreground",
      icon: MinusCircleIcon,
    };
  }

  if (part.isEligible) {
    return {
      label: "Indexed",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2Icon,
    };
  }

  return {
    label: "Below threshold",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: XCircleIcon,
  };
}

function formatScore(value: number | null) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function ScoreItem({
  label,
  value,
  min,
}: {
  label: string;
  value: number | null;
  min: number;
}) {
  const belowMin = value != null && value < min;

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          belowMin && "text-amber-700 dark:text-amber-400",
        )}
      >
        {formatScore(value)}
      </p>
    </div>
  );
}

function PartCard({ part }: { part: DocumentPartListItem }) {
  const typeBadge = getContentTypeBadge(part.contentType);
  const TypeBadgeIcon = typeBadge.icon;
  const eligibility = getEligibilityBadge(part);
  const EligibilityIcon = eligibility.icon;
  const isMedia = part.contentType !== "text";
  const mediaHref = part.storageUrl ?? part.value;

  return (
    <li className="min-w-0 rounded-xl border bg-card px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Part {part.partIndex}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            typeBadge.className,
          )}
        >
          <TypeBadgeIcon className="size-3" />
          {typeBadge.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            eligibility.className,
          )}
        >
          <EligibilityIcon className="size-3" />
          {eligibility.label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <ScoreItem
          label="Relevance"
          value={part.relevanceScore}
          min={PART_RELEVANCE_MIN}
        />
        <ScoreItem label="Detail" value={part.detailScore} min={PART_DETAIL_MIN} />
        <ScoreItem label="Part score" value={part.partScore} min={0} />
      </div>

      {isMedia && part.contentType === "image" && part.storageUrl ? (
        <a
          href={mediaHref}
          target="_blank"
          rel="noreferrer noopener"
          className="mb-3 block w-fit"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={part.storageUrl}
            alt={part.summary ?? `Image part ${part.partIndex}`}
            className="max-h-48 rounded-md border object-contain"
            loading="lazy"
          />
        </a>
      ) : null}

      {isMedia ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <p className="text-sm wrap-break-word whitespace-pre-wrap">
            {part.summary?.trim() || (
              <span className="text-muted-foreground">
                No retrievable information detected.
              </span>
            )}
          </p>
        </div>
      ) : (
        <p className="line-clamp-4 text-sm wrap-break-word whitespace-pre-wrap text-muted-foreground">
          {part.summary?.trim() || part.value.trim()}
        </p>
      )}

      {part.scoreError ? (
        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
          {part.scoreError}
        </p>
      ) : null}

      {isMedia ? (
        <a
          href={mediaHref}
          target="_blank"
          rel="noreferrer noopener"
          title={mediaHref}
          className="mt-2 block max-w-full break-all text-xs text-primary underline-offset-4 hover:underline"
        >
          {mediaHref}
        </a>
      ) : null}
    </li>
  );
}

export function DocumentDetailParts({
  workspaceId,
  documentId,
}: DocumentDetailPartsProps) {
  const partsQuery = useQuery({
    queryKey: documentPartsQueryKey(workspaceId, documentId),
    queryFn: () => fetchDocumentParts(workspaceId, documentId),
  });

  const items = partsQuery.data?.items ?? [];
  const eligibleCount = partsQuery.data?.eligibleCount ?? 0;

  return (
    <section className="mt-8 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Parts</h2>
        <p className="text-sm text-muted-foreground">
          Each text body, image, and video is scored on its own for relevance
          and detail. Only parts above both thresholds (
          {Math.round(PART_RELEVANCE_MIN * 100)}% /{" "}
          {Math.round(PART_DETAIL_MIN * 100)}%) are classified and indexed.
        </p>
      </div>

      {partsQuery.error ? (
        <ResourceListEmpty
          title="Could not load parts"
          description={partsQuery.error.message}
        />
      ) : partsQuery.isLoading ? (
        <ul className="flex flex-col gap-2.5">
          {Array.from({ length: 2 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-28 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <ResourceListEmpty
          title="No parts yet"
          description="This document has not been scored. Use Re-score quality to split it into parts and score them."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {eligibleCount} of {items.length} part
            {items.length === 1 ? "" : "s"} indexed
          </p>
          <ul className="flex flex-col gap-2.5">
            {items.map((part) => (
              <PartCard key={part.id} part={part} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
