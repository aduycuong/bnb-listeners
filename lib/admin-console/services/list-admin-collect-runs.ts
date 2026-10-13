import { and, count, desc, eq } from "drizzle-orm";

import { collectRuns, sources } from "@/db/schema";
import { db } from "@/lib/db";

import type { AdminCollectRunRow, ListAdminCollectRunsParams, PageResult } from "../types";
import { collectRunRowColumns, toCollectRunRow } from "../utils/collect-run-row";
import { resolvePage } from "../utils/resolve-page";

/** Collect runs newest first, filtered and paged. */
export async function listAdminCollectRuns(
  params: ListAdminCollectRunsParams,
): Promise<PageResult<AdminCollectRunRow>> {
  const { page, pageSize, offset } = resolvePage(params);

  const where = and(
    params.sourceId ? eq(collectRuns.sourceId, params.sourceId) : undefined,
    params.connector ? eq(collectRuns.connector, params.connector) : undefined,
    params.status ? eq(collectRuns.status, params.status) : undefined,
  );

  const [rows, [total]] = await Promise.all([
    db
      .select(collectRunRowColumns)
      .from(collectRuns)
      .leftJoin(sources, eq(sources.id, collectRuns.sourceId))
      .where(where)
      .orderBy(desc(collectRuns.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(collectRuns).where(where),
  ]);

  return {
    items: rows.map(toCollectRunRow),
    total: total?.value ?? 0,
    page,
    pageSize,
  };
}
