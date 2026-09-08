"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOPIC_CREATED_BY } from "@/lib/topics/topic-config";
import type { GetTopicResult } from "@/lib/topics/types";
import { cn } from "@/lib/utils";

type TopicDetailGeneralProps = {
  topic: GetTopicResult;
  onSourceDocumentClick?: (documentId: string) => void;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCreatedByBadge(createdBy: string) {
  if (createdBy === TOPIC_CREATED_BY.llmClassifier) {
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

export function TopicDetailGeneral({
  topic,
  onSourceDocumentClick,
}: TopicDetailGeneralProps) {
  const createdByBadge = getCreatedByBadge(topic.createdBy);
  const sourceDocumentLabel =
    topic.sourceDocument?.title?.trim() ||
    topic.sourceDocument?.sourceName ||
    topic.sourceDocument?.sourceId;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Description</p>
          <p className="mt-1 whitespace-pre-wrap">
            {topic.description?.trim() || "—"}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Created</dt>
            <dd className="mt-1">{formatDateTime(topic.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Updated</dt>
            <dd className="mt-1">{formatDateTime(topic.updatedAt)}</dd>
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
              {topic.sourceDocument && sourceDocumentLabel ? (
                <button
                  type="button"
                  className="text-left text-primary underline-offset-4 hover:underline"
                  onClick={() =>
                    onSourceDocumentClick?.(topic.sourceDocument!.id)
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
