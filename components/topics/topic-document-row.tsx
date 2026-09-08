"use client";

import type { TopicDocumentListItem } from "@/lib/topics/types";
import { cn } from "@/lib/utils";

type TopicDocumentRowProps = {
  document: TopicDocumentListItem;
  onClick?: () => void;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function TopicDocumentRow({ document, onClick }: TopicDocumentRowProps) {
  const title = document.title?.trim() || document.sourceId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition hover:bg-muted/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[document.sourceName, document.jobName]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-muted-foreground">
          Confidence {formatConfidence(document.confidence)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(document.publishedAt)}
        </p>
      </div>
    </button>
  );
}
