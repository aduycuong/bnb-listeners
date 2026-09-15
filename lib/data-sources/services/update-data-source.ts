import { and, eq, ne } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { DuplicateError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { SourceType } from "@/lib/data-sources/constants";
import { parseSourceParams } from "@/lib/data-sources/handlers/registry";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateDataSourceParams, UpdateDataSourceResult } from "../types";
import { syncDataSourceSchedule } from "./sync-data-source-schedule";

export async function updateDataSource(
  params: UpdateDataSourceParams,
  ctx: WorkspaceContext,
): Promise<UpdateDataSourceResult> {
  const { id, ...updates } = params;

  const [existingJob] = await db
    .select()
    .from(dataSources)
    .where(and(eq(dataSources.id, id), eq(dataSources.workspaceId, ctx.workspaceId)))
    .limit(1);

  if (!existingJob) {
    throw new NotFoundError("data source", id);
  }

  if (updates.name) {
    const [existing] = await db
      .select({ id: dataSources.id })
      .from(dataSources)
      .where(
        and(
          eq(dataSources.workspaceId, ctx.workspaceId),
          eq(dataSources.name, updates.name),
          ne(dataSources.id, id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new DuplicateError("data source", existing.id, "with this name");
    }
  }

  const effectiveJobType = (updates.sourceType ??
    existingJob.sourceType) as SourceType;

  if (updates.params !== undefined) {
    updates.params = parseSourceParams(effectiveJobType, updates.params);
  }

  const [dataSource] = await db
    .update(dataSources)
    .set(updates)
    .where(and(eq(dataSources.id, id), eq(dataSources.workspaceId, ctx.workspaceId)))
    .returning();

  if (!dataSource) {
    throw new NotFoundError("data source", id);
  }

  await syncDataSourceSchedule({ dataSourceId: dataSource.id, userId: ctx.userId });

  return dataSource;
}
