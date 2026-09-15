import { and, eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetDataSourceParams, GetDataSourceResult } from "../types";

export async function getDataSource(
  params: GetDataSourceParams,
  ctx: WorkspaceContext,
): Promise<GetDataSourceResult> {
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

  return dataSource;
}
