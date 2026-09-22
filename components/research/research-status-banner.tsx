"use client";

import { Loader2Icon } from "lucide-react";

import {
  getResearchStatusLabel,
} from "@/lib/research/research-config";
import type { ResearchStatus } from "@/lib/research/types";

type ResearchStatusBannerProps = {
  status: ResearchStatus;
  error?: string | null;
};

export function ResearchStatusBanner({
  status,
  error,
}: ResearchStatusBannerProps) {
  const isActive = status === "pending" || status === "running";

  if (status === "succeeded") {
    return null;
  }

  return (
    <div
      className={
        status === "failed"
          ? "rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2"
          : "rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2"
      }
    >
      <div className="flex items-center gap-2">
        {isActive ? (
          <Loader2Icon className="size-4 animate-spin text-primary" />
        ) : null}
        <p className="text-sm font-medium">
          {isActive
            ? "Research in progress"
            : `Research ${getResearchStatusLabel(status).toLowerCase()}`}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {isActive
          ? "Planning, gathering evidence, and synthesizing a report. This page refreshes automatically."
          : null}
        {status === "failed"
          ? (error ?? "The research run failed without a specific error message.")
          : null}
      </p>
    </div>
  );
}
