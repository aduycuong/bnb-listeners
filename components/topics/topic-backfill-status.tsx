"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { cancelTopicBackfillRunRequest } from "@/components/topics/topic-backfill-request";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { TopicBackfillRunItem } from "@/lib/topic-backfill/types";

type TopicBackfillStatusProps = {
  workspaceId: string;
  topicId: string;
  run: TopicBackfillRunItem;
  onUpdated: () => Promise<void>;
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined).format(value);
}

function getProgressPercent(run: TopicBackfillRunItem): number {
  const total = run.estimate.documentCount;
  if (total <= 0) {
    return run.status === "success" ? 100 : 0;
  }

  return Math.min(100, Math.round((run.result.documentsScanned / total) * 100));
}

export function TopicBackfillStatus({
  workspaceId,
  topicId,
  run,
  onUpdated,
}: TopicBackfillStatusProps) {
  const [cancelling, setCancelling] = useState(false);
  const isActive = run.status === "pending" || run.status === "running";
  const progress = getProgressPercent(run);

  async function handleCancel() {
    setCancelling(true);

    try {
      await cancelTopicBackfillRunRequest(workspaceId, topicId, run.id);
      toast.add({ title: "Backfill cancelled.", type: "success" });
      await onUpdated();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error ? error.message : "Could not cancel backfill.",
        type: "error",
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {isActive ? "Backfill in progress" : `Backfill ${run.status}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Checking documents from {run.newListeningStartedAt.slice(0, 10)} up
            to topic created date.
          </p>
        </div>
        {isActive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCancel()}
            disabled={cancelling}
          >
            {cancelling ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                Cancelling…
              </>
            ) : (
              "Cancel"
            )}
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatNumber(run.result.documentsScanned)} /{" "}
          {formatNumber(run.estimate.documentCount)} scanned ·{" "}
          {formatNumber(run.result.documentsMatched)} matched ·{" "}
          {formatUsd(run.result.costUsd)} spent
        </p>
      </div>

      {run.error ? (
        <p className="text-xs text-destructive">{run.error}</p>
      ) : null}
    </div>
  );
}
