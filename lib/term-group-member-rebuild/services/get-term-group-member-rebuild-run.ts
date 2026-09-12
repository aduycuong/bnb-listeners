import { and, eq } from "drizzle-orm";

import { termGroupMemberRebuildRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  GetTermGroupMemberRebuildRunParams,
  GetTermGroupMemberRebuildRunResult,
} from "../types";
import { toTermGroupMemberRebuildRunItem } from "../utils/to-term-group-member-rebuild-run-item";

export async function getTermGroupMemberRebuildRun(
  params: GetTermGroupMemberRebuildRunParams,
  ctx: WorkspaceContext,
): Promise<GetTermGroupMemberRebuildRunResult> {
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

  return { run: toTermGroupMemberRebuildRunItem(run) };
}
