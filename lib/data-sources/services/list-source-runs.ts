import { and, desc, eq } from "drizzle-orm";

import { sourceRuns, dataSources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListSourceRunsParams, ListSourceRunsResult } from "../types";

const DEFAULT_LIMIT = 20;

export async function listSourceRuns(
  params: ListSourceRunsParams,
  ctx: WorkspaceContext,
): Promise<ListSourceRunsResult> {
  const [dataSource] = await db
    .select({ id: dataSources.id })
    .from(dataSources)
    .where(
      and(eq(dataSources.id, params.id), eq(dataSources.workspaceId, ctx.workspaceId)),
    )
    .limit(1);

  if (!dataSource) {
    throw new NotFoundError("data source", params.id);
  }

  const rows = await db
    .select({
      id: sourceRuns.id,
      runType: sourceRuns.runType,
      status: sourceRuns.status,
      result: sourceRuns.result,
      error: sourceRuns.error,
      startedAt: sourceRuns.startedAt,
      finishedAt: sourceRuns.finishedAt,
    })
    .from(sourceRuns)
    .where(eq(sourceRuns.dataSourceId, params.id))
    .orderBy(desc(sourceRuns.startedAt))
    .limit(DEFAULT_LIMIT);

  return {
    items: rows.map((row) => ({
      ...row,
      result: row.result ?? null,
      error: row.error ?? null,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    })),
  };
}
