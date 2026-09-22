"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";

import {
  downloadResearchHtmlReport,
  ResearchHtmlReport,
} from "@/components/research/research-html-report";
import { researchRunQueryKey } from "@/components/research/research-query-keys";
import { rebuildResearchHtmlRequest } from "@/components/research/research-request";
import { Button } from "@/components/ui/button";
import type { ResearchHtmlStatus } from "@/lib/research/types";

type ResearchPresentationProps = {
  workspaceId: string;
  runId: string;
  canEdit: boolean;
  reportHtml: string | null;
  htmlStatus: ResearchHtmlStatus | null;
  htmlError: string | null;
};

export function ResearchPresentation({
  workspaceId,
  runId,
  canEdit,
  reportHtml,
  htmlStatus,
  htmlError,
}: ResearchPresentationProps) {
  const queryClient = useQueryClient();
  const isGenerating = htmlStatus === "pending" || htmlStatus === "running";

  const rebuildMutation = useMutation({
    mutationFn: () => rebuildResearchHtmlRequest(workspaceId, runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: researchRunQueryKey(workspaceId, runId),
      });
    },
  });

  const rebuildDisabled = rebuildMutation.isPending || isGenerating;
  const showRebuild = canEdit && !isGenerating;
  const showDownload = Boolean(reportHtml);

  return (
    <div className="space-y-4">
      {showRebuild || showDownload ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showRebuild ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => rebuildMutation.mutate()}
              disabled={rebuildDisabled}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {rebuildMutation.isPending ? "Rebuilding…" : "Rebuild presentation"}
            </Button>
          ) : null}
          {showDownload ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadResearchHtmlReport(runId, reportHtml!)}
            >
              <DownloadIcon data-icon="inline-start" />
              Download HTML
            </Button>
          ) : null}
        </div>
      ) : null}

      {isGenerating ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <Loader2Icon className="size-4 animate-spin text-primary" />
          <span>Generating HTML presentation… This page refreshes automatically.</span>
        </div>
      ) : null}

      {htmlStatus === "failed" ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium">Presentation generation failed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {htmlError ?? "The HTML presentation could not be generated."}
            {canEdit ? " Use Rebuild presentation to try again." : ""}
          </p>
        </div>
      ) : null}

      {rebuildMutation.isError ? (
        <p className="text-xs text-destructive">
          {rebuildMutation.error instanceof Error
            ? rebuildMutation.error.message
            : "Failed to start rebuild."}
        </p>
      ) : null}

      {reportHtml ? (
        <ResearchHtmlReport html={reportHtml} />
      ) : !isGenerating && htmlStatus !== "failed" ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          Waiting for the HTML presentation…
        </div>
      ) : null}
    </div>
  );
}
