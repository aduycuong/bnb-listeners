import { asc, eq } from "drizzle-orm";

import { sourceGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListSourceGroupsParams, ListSourceGroupsResult } from "../types";
import { toSourceGroupListItem } from "../utils/to-source-group-list-item";

export async function listSourceGroups(
  _params: ListSourceGroupsParams = {},
  ctx: WorkspaceContext,
): Promise<ListSourceGroupsResult> {
  const rows = await db
    .select()
    .from(sourceGroups)
    .where(eq(sourceGroups.workspaceId, ctx.workspaceId))
    .orderBy(asc(sourceGroups.name));

  return {
    items: rows.map(toSourceGroupListItem),
  };
}
