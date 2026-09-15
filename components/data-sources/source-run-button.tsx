"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { useState, type MouseEvent } from "react";

import { sourceRunsQueryKey } from "@/components/data-sources/data-source-query-keys";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { RunDataSourceResult } from "@/lib/data-sources/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type SourceRunButtonProps = {
  workspaceId: string;
  dataSourceId: string;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

export function SourceRunButton({
  workspaceId,
  dataSourceId,
  label = "Run",
  ariaLabel,
  disabled = false,
}: SourceRunButtonProps) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  async function handleRun(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    setRunning(true);

    try {
      const res = await workspaceFetch(workspaceId, `/api/data-sources/${dataSourceId}/run`, {
        method: "POST",
      });
      const data = (await res.json()) as RunDataSourceResult & {
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not run dataSource.",
          type: "error",
        });
        return;
      }

      if (data.status === "failed") {
        toast.add({
          title: data.error ?? "Job failed.",
          type: "error",
        });
      } else if (data.status === "running") {
        toast.add({
          title: "Job started.",
          type: "success",
        });
      } else {
        toast.add({
          title: "Job completed.",
          type: "success",
        });
      }

      await queryClient.invalidateQueries({
        queryKey: sourceRunsQueryKey(workspaceId, dataSourceId),
      });
    } catch {
      toast.add({
        title: "Could not run dataSource.",
        type: "error",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || running}
      onClick={handleRun}
      aria-label={ariaLabel ?? label}
    >
      {running ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <PlayIcon data-icon="inline-start" />
      )}
      {running ? "Running…" : label}
    </Button>
  );
}
