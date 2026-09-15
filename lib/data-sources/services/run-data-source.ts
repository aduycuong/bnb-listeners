import { and, eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { RunDataSourceParams, RunDataSourceResult } from "../types";
import { executeDataSource } from "./execute-data-source";

export async function runDataSource(
  params: RunDataSourceParams,
  ctx: WorkspaceContext,
): Promise<RunDataSourceResult> {
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(
      and(eq(dataSources.id, params.id), eq(dataSources.workspaceId, ctx.workspaceId)),
    )
    .limit(1);

  if (!dataSource) {
    throw new NotFoundError("data source", params.id);
  }

  const run = await executeDataSource({ dataSource, userId: ctx.userId });

  return {
    id: run.id,
    runType: run.runType,
    status: run.status,
    result: run.result,
    error: run.error,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
