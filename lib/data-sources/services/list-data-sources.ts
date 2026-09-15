import { and, desc, eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListDataSourcesParams, ListDataSourcesResult } from "../types";

export async function listDataSources(
  params: ListDataSourcesParams,
  ctx: WorkspaceContext,
): Promise<ListDataSourcesResult> {
  const conditions = [eq(dataSources.workspaceId, ctx.workspaceId)];

  if (params.sourceType) {
    conditions.push(eq(dataSources.sourceType, params.sourceType));
  }

  const rows = await db
    .select({
      id: dataSources.id,
      name: dataSources.name,
      sourceType: dataSources.sourceType,
      enabled: dataSources.enabled,
      cronConfig: dataSources.cronConfig,
      createdAt: dataSources.createdAt,
      updatedAt: dataSources.updatedAt,
    })
    .from(dataSources)
    .where(and(...conditions))
    .orderBy(desc(dataSources.createdAt));

  return {
    items: rows.map((row) => ({
      ...row,
      cronConfig: row.cronConfig ?? { cron: "", timezone: "UTC" },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
