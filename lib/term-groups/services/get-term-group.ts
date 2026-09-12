import { eq } from "drizzle-orm";

import { termGroupMemberRebuildRuns, termGroups } from "@/db/schema";
import { db } from "@/lib/db";
import { toTermGroupMemberRebuildRunItem } from "@/lib/term-group-member-rebuild/utils/to-term-group-member-rebuild-run-item";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetTermGroupParams, TermGroupDetail } from "../types";
import { assertTermGroupInWorkspace } from "../utils/assert-term-group-in-workspace";
import { countTermGroupMembers } from "../utils/count-term-group-members";
import { toTermGroupListItem } from "../utils/to-term-group-list-item";

export async function getTermGroup(
  params: GetTermGroupParams,
  ctx: WorkspaceContext,
): Promise<TermGroupDetail> {
  await assertTermGroupInWorkspace(params.id, ctx.workspaceId);

  const [group] = await db
    .select()
    .from(termGroups)
    .where(eq(termGroups.id, params.id))
    .limit(1);

  const memberCount = await countTermGroupMembers(params.id);

  let activeMemberRebuildRun = null;

  if (group!.activeMemberRebuildRunId) {
    const [run] = await db
      .select()
      .from(termGroupMemberRebuildRuns)
      .where(eq(termGroupMemberRebuildRuns.id, group!.activeMemberRebuildRunId))
      .limit(1);

    if (run) {
      activeMemberRebuildRun = toTermGroupMemberRebuildRunItem(run);
    }
  }

  return {
    ...toTermGroupListItem(group!, memberCount),
    activeMemberRebuildRun,
  };
}
