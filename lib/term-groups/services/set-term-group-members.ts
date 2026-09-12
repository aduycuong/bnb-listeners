import { and, eq, inArray } from "drizzle-orm";

import { termGroupMembers, terms } from "@/db/schema";
import { UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  MAX_GROUPS_PER_TERM,
  TERM_GROUP_ASSIGNED_BY,
} from "../term-group-config";
import type { SetTermGroupMembersParams, SetTermGroupMembersResult } from "../types";
import { assertTermGroupInWorkspace } from "../utils/assert-term-group-in-workspace";
import { countTermGroupMembers } from "../utils/count-term-group-members";

async function assertTermsInWorkspace(
  termIds: string[],
  workspaceId: string,
): Promise<void> {
  if (termIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(
        eq(terms.workspaceId, workspaceId),
        inArray(terms.id, termIds),
      ),
    );

  if (rows.length !== termIds.length) {
    throw new UnknownServiceError("One or more terms are not in this workspace.");
  }
}

async function assertTermGroupLimits(
  termIds: string[],
  termGroupId: string,
): Promise<void> {
  if (termIds.length === 0) {
    return;
  }

  for (const termId of termIds) {
    const rows = await db
      .select({ termGroupId: termGroupMembers.termGroupId })
      .from(termGroupMembers)
      .where(eq(termGroupMembers.termId, termId));

    const groupsAfterAssign = new Set(rows.map((row) => row.termGroupId));
    groupsAfterAssign.add(termGroupId);

    if (groupsAfterAssign.size > MAX_GROUPS_PER_TERM) {
      throw new UnknownServiceError(
        `A term cannot belong to more than ${MAX_GROUPS_PER_TERM} groups.`,
      );
    }
  }
}

export async function setTermGroupMembers(
  params: SetTermGroupMembersParams,
  ctx: WorkspaceContext,
): Promise<SetTermGroupMembersResult> {
  const group = await assertTermGroupInWorkspace(params.id, ctx.workspaceId);
  const uniqueTermIds = [...new Set(params.termIds)];

  await assertTermsInWorkspace(uniqueTermIds, ctx.workspaceId);
  await assertTermGroupLimits(uniqueTermIds, params.id);

  await db
    .delete(termGroupMembers)
    .where(eq(termGroupMembers.termGroupId, params.id));

  if (uniqueTermIds.length > 0) {
    await db.insert(termGroupMembers).values(
      uniqueTermIds.map((termId) => ({
        termGroupId: params.id,
        termId,
        assignedBy: TERM_GROUP_ASSIGNED_BY.admin,
      })),
    );
  }

  const memberCount = await countTermGroupMembers(params.id);

  return {
    id: params.id,
    memberCount,
    message: `Updated members for “${group.name}”.`,
  };
}
