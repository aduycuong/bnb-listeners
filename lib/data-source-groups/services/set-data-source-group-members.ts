import { and, eq, inArray } from "drizzle-orm";

import {
  dataSourceGroupMembers,
  dataSources,
} from "@/db/schema";
import { UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  DATA_SOURCE_GROUP_ASSIGNED_BY,
  MAX_GROUPS_PER_DATA_SOURCE,
} from "../data-source-group-config";
import type {
  SetDataSourceGroupMembersParams,
  SetDataSourceGroupMembersResult,
} from "../types";
import { assertDataSourceGroupInWorkspace } from "../utils/assert-data-source-group-in-workspace";
import { countDataSourceGroupMembers } from "../utils/count-data-source-group-members";

async function assertDataSourcesInWorkspace(
  dataSourceIds: string[],
  workspaceId: string,
): Promise<void> {
  if (dataSourceIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ id: dataSources.id })
    .from(dataSources)
    .where(
      and(
        eq(dataSources.workspaceId, workspaceId),
        inArray(dataSources.id, dataSourceIds),
      ),
    );

  if (rows.length !== dataSourceIds.length) {
    throw new UnknownServiceError(
      "One or more data sources are not in this workspace.",
    );
  }
}

async function assertDataSourceGroupLimits(
  dataSourceIds: string[],
  dataSourceGroupId: string,
): Promise<void> {
  if (dataSourceIds.length === 0) {
    return;
  }

  for (const dataSourceId of dataSourceIds) {
    const rows = await db
      .select({
        dataSourceGroupId: dataSourceGroupMembers.dataSourceGroupId,
      })
      .from(dataSourceGroupMembers)
      .where(eq(dataSourceGroupMembers.dataSourceId, dataSourceId));

    const groupsAfterAssign = new Set(
      rows.map((row) => row.dataSourceGroupId),
    );
    groupsAfterAssign.add(dataSourceGroupId);

    if (groupsAfterAssign.size > MAX_GROUPS_PER_DATA_SOURCE) {
      throw new UnknownServiceError(
        `A data source cannot belong to more than ${MAX_GROUPS_PER_DATA_SOURCE} groups.`,
      );
    }
  }
}

export async function setDataSourceGroupMembers(
  params: SetDataSourceGroupMembersParams,
  ctx: WorkspaceContext,
): Promise<SetDataSourceGroupMembersResult> {
  const group = await assertDataSourceGroupInWorkspace(
    params.id,
    ctx.workspaceId,
  );
  const uniqueDataSourceIds = [...new Set(params.dataSourceIds)];

  await assertDataSourcesInWorkspace(uniqueDataSourceIds, ctx.workspaceId);
  await assertDataSourceGroupLimits(uniqueDataSourceIds, params.id);

  await db
    .delete(dataSourceGroupMembers)
    .where(eq(dataSourceGroupMembers.dataSourceGroupId, params.id));

  if (uniqueDataSourceIds.length > 0) {
    await db.insert(dataSourceGroupMembers).values(
      uniqueDataSourceIds.map((dataSourceId) => ({
        dataSourceGroupId: params.id,
        dataSourceId,
        assignedBy: DATA_SOURCE_GROUP_ASSIGNED_BY.admin,
      })),
    );
  }

  const memberCount = await countDataSourceGroupMembers(params.id);

  return {
    id: params.id,
    memberCount,
    message: `Updated members for “${group.name}”.`,
  };
}
