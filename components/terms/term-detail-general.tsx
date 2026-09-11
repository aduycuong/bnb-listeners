"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TERM_CREATED_BY } from "@/lib/terms/term-config";
import type { GetTermResult } from "@/lib/terms/types";
import { cn } from "@/lib/utils";

type TermDetailGeneralProps = {
  term: GetTermResult;
  onSourceDocumentClick?: (documentId: string) => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCreatedByBadge(createdBy: string) {
  if (createdBy === TERM_CREATED_BY.llmClassifier) {
    return {
      label: "Classifier",
      className: "bg-muted text-muted-foreground",
    };
  }

  return {
    label: "Admin",
    className: "bg-muted text-muted-foreground",
  };
}

export function TermDetailGeneral({
  term,
  onSourceDocumentClick,
}: TermDetailGeneralProps) {
  const createdByBadge = getCreatedByBadge(term.createdBy);
  const sourceDocumentLabel =
    term.sourceDocument?.title?.trim() ||
    term.sourceDocument?.sourceName ||
    term.sourceDocument?.sourceId;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          <p className="mt-1 whitespace-pre-wrap">
            {term.description?.trim() || "—"}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Created</dt>
            <dd className="mt-1">{formatDateTime(term.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Updated</dt>
            <dd className="mt-1">{formatDateTime(term.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Created by
            </dt>
            <dd className="mt-1">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                  createdByBadge.className,
                )}
              >
                {createdByBadge.label}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Source document
            </dt>
            <dd className="mt-1">
              {term.sourceDocument && sourceDocumentLabel ? (
                <button
                  type="button"
                  className="text-left text-primary underline-offset-4 hover:underline"
                  onClick={() =>
                    onSourceDocumentClick?.(term.sourceDocument!.id)
                  }
                >
                  {sourceDocumentLabel}
                </button>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
