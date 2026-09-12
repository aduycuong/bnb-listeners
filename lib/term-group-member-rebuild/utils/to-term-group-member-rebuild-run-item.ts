import type { TermGroupMemberRebuildRun } from "@/db/schema";

import type { TermGroupMemberRebuildRunItem } from "../types";

export function toTermGroupMemberRebuildRunItem(
  run: TermGroupMemberRebuildRun,
): TermGroupMemberRebuildRunItem {
  return {
    id: run.id,
    termGroupId: run.termGroupId,
    status: run.status,
    model: run.model,
    includeAlreadyMembers: run.includeAlreadyMembers,
    removeNonMatching: run.removeNonMatching,
    enableWebResearch: run.enableWebResearch,
    confidenceMin: run.confidenceMin,
    estimate: run.estimate,
    result: run.result,
    error: run.error,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
