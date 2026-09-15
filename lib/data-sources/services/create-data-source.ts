import { and, eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import {
  CreateFailedError,
  DuplicateError,
} from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { parseSourceParams } from "@/lib/data-sources/handlers/registry";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { CreateDataSourceParams, CreateDataSourceResult } from "../types";
import { syncDataSourceSchedule } from "./sync-data-source-schedule";

export async function createDataSource(
  params: CreateDataSourceParams,
  ctx: WorkspaceContext,
): Promise<CreateDataSourceResult> {
  const parsedParams = parseSourceParams(params.sourceType, params.params);
  const [existing] = await db
    .select({ id: dataSources.id })
    .from(dataSources)
    .where(
      and(
        eq(dataSources.workspaceId, ctx.workspaceId),
        eq(dataSources.name, params.name),
      ),
    )
    .limit(1);

  if (existing) {
    throw new DuplicateError("data source", existing.id, "with this name");
  }

  const [dataSource] = await db
    .insert(dataSources)
    .values({
      workspaceId: ctx.workspaceId,
      name: params.name,
      sourceType: params.sourceType,
      cronConfig: params.cronConfig,
      enabled: params.enabled,
      params: parsedParams,
    })
    .returning();

  if (!dataSource) {
    throw new CreateFailedError("data source");
  }

  await syncDataSourceSchedule({ dataSourceId: dataSource.id, userId: ctx.userId });

  return dataSource;
}
