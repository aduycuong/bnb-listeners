"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { cancelTermGroupMemberRebuildRunRequest } from "@/components/term-groups/term-group-member-rebuild-request";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { TermGroupMemberRebuildRunItem } from "@/lib/term-group-member-rebuild/types";

type TermGroupMemberRebuildStatusProps = {
  workspaceId: string;
  groupId: string;
  run: TermGroupMemberRebuildRunItem;
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

function getProgressPercent(run: TermGroupMemberRebuildRunItem): number {
  if (run.status === "success") {
    return 100;
  }

  const total = run.estimate.termCount;
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((run.result.termsScanned / total) * 100));
}

export function TermGroupMemberRebuildStatus({
  workspaceId,
  groupId,
  run,
  onUpdated,
}: TermGroupMemberRebuildStatusProps) {
  const [cancelling, setCancelling] = useState(false);
  const isActive = run.status === "pending" || run.status === "running";
  const progress = getProgressPercent(run);

  async function handleCancel() {
    setCancelling(true);

    try {
      await cancelTermGroupMemberRebuildRunRequest(
        workspaceId,
        groupId,
        run.id,
      );
      toast.add({ title: "Member rebuild cancelled.", type: "success" });
      await onUpdated();
    } catch (error) {
      toast.add({
        title:
          error instanceof Error
            ? error.message
            : "Could not cancel member rebuild.",
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
            {isActive ? "Member rebuild in progress" : `Rebuild ${run.status}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Scanning workspace terms and assigning matches to this group.
            {run.enableWebResearch
              ? " Web research via Exa is enabled when needed."
              : null}
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
          {formatNumber(run.result.termsScanned)} /{" "}
          {formatNumber(run.estimate.termCount)} scanned ·{" "}
          {formatNumber(run.result.termsMatched)} added ·{" "}
          {formatNumber(run.result.termsRemoved)} removed ·{" "}
          {formatNumber(run.result.webQueries)} web queries ·{" "}
          {formatUsd(run.result.costUsd)} spent
        </p>
      </div>

      {run.error ? (
        <p className="text-xs text-destructive">{run.error}</p>
      ) : null}
    </div>
  );
}
