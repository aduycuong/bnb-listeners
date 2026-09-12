import { and, eq } from "drizzle-orm";

import { termGroupMemberRebuildRuns } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  CancelTermGroupMemberRebuildRunParams,
  CancelTermGroupMemberRebuildRunResult,
} from "../types";
import { toTermGroupMemberRebuildRunItem } from "../utils/to-term-group-member-rebuild-run-item";
import { finalizeTermGroupMemberRebuildRun } from "./finalize-term-group-member-rebuild-run";

export async function cancelTermGroupMemberRebuildRun(
  params: CancelTermGroupMemberRebuildRunParams,
  ctx: WorkspaceContext,
): Promise<CancelTermGroupMemberRebuildRunResult> {
  const [run] = await db
    .select()
    .from(termGroupMemberRebuildRuns)
    .where(
      and(
        eq(termGroupMemberRebuildRuns.id, params.runId),
        eq(termGroupMemberRebuildRuns.termGroupId, params.id),
        eq(termGroupMemberRebuildRuns.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!run) {
    throw new NotFoundError("term_group_member_rebuild_run", params.runId);
  }

  if (run.status !== "pending" && run.status !== "running") {
    throw new UnknownServiceError("This rebuild run is no longer active.");
  }

  const cancelledAt = new Date().toISOString();

  const [updated] = await db
    .update(termGroupMemberRebuildRuns)
    .set({
      status: "cancelled",
      finishedAt: new Date(),
      result: {
        ...run.result,
        cancelledAt,
      },
    })
    .where(eq(termGroupMemberRebuildRuns.id, run.id))
    .returning();

  if (!updated) {
    throw new UnknownServiceError("Failed to cancel member rebuild run.");
  }

  await finalizeTermGroupMemberRebuildRun({ run: updated, success: false });

  return { run: toTermGroupMemberRebuildRunItem(updated) };
}
