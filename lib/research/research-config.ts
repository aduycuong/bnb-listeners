import type { DepthLevel, ResearchStatus } from "./types";

export const RESEARCH_SEGMENT = "research";

export const RESEARCH_CONFIG = {
  segment: RESEARCH_SEGMENT,
  listTitle: "Research",
  listDescription:
    "Deep research runs over your workspace data with optional web search.",
  emptyTitle: "No research runs yet",
  emptyDescription:
    "Start a research run to explore trends, topics, and insights in your data.",
  createLabel: "New research",
  formTitle: "Start research",
  formDescription:
    "Describe what you want to learn. The system will plan, gather evidence, and synthesize a report.",
  formRerunTitle: "Rerun research",
  formRerunDescription:
    "Review and adjust the inputs, then start a new run with the updated settings.",
} as const;

export function getResearchRerunHref(
  workspaceIndex: number,
  fromRunId: string,
): string {
  return `${getResearchHref(workspaceIndex, "new")}?fromRunId=${encodeURIComponent(fromRunId)}`;
}

export function getResearchHref(
  workspaceIndex: number,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${RESEARCH_SEGMENT}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}

export function getResearchStatusLabel(status: ResearchStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function getResearchStatusBadgeClass(status: ResearchStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "running":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
    case "succeeded":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "failed":
      return "bg-destructive/10 text-destructive";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function getResearchDepthLabel(depth: DepthLevel): string {
  switch (depth) {
    case "quick":
      return "Quick";
    case "standard":
      return "Standard";
    case "deep":
      return "Deep";
    default: {
      const exhaustive: never = depth;
      return exhaustive;
    }
  }
}
