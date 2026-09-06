import { asc, eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListSourceGroupsParams, ListSourceGroupsResult } from "../types";
import { createNoGroupSourceGroup } from "./create-no-group-source-group";
import { getNoGroupId } from "../utils/get-no-group-id";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

/**
 * List source groups for a workspace.
 *
 * Normal groups are returned first, sorted alphabetically. The auto-created
 * "No group" row — identified by its deterministic UUID — is appended last.
 */
export async function listSourceGroups(
  _params: ListSourceGroupsParams = {},
  ctx: WorkspaceContext,
): Promise<ListSourceGroupsResult> {
  await createNoGroupSourceGroup(ctx.workspaceId);

  const noGroupId = getNoGroupId(ctx.workspaceId);

  const rows = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.workspaceId, ctx.workspaceId))
    .orderBy(asc(sourceGroups.name));

  const sorted = [
    ...rows.filter((row) => row.id !== noGroupId),
    ...rows.filter((row) => row.id === noGroupId),
  ];

  return {
    items: sorted.map(toSourceGroupListItem),
  };
}
