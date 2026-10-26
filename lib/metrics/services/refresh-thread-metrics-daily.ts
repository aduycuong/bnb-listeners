import { sql } from "drizzle-orm";

import { uuidArraySql } from "@/lib/common/uuid-array-sql";
import { db } from "@/lib/db";

import { METRICS_CONFIG } from "../config";
import type { RefreshProjectMetricsDailyResult } from "../types";
import { refreshProjectMetricsDaily } from "./refresh-project-metrics-daily";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * L4 refresh after an Enrich run (D28): the last `dailyRefreshDays` days, reaching back to
 * the oldest mention of the enriched threads (a backfill enriches old threads).
 */
export async function refreshThreadMetricsDaily(params: {
  projectId: string;
  rootIds: string[];
}): Promise<RefreshProjectMetricsDailyResult> {
  let from = new Date(Date.now() - (METRICS_CONFIG.dailyRefreshDays - 1) * DAY_MS);
  if (params.rootIds.length > 0) {
    const { rows } = await db.execute<{ oldest: string | null }>(sql`
      select min(m.published_at) as oldest from mentions m
      where m.project_id = ${params.projectId}::uuid
        and coalesce(m.root_item_id, m.content_item_id) = any(${uuidArraySql(params.rootIds)})
    `);
    const oldest = rows[0]?.oldest ? new Date(rows[0].oldest) : null;
    if (oldest && oldest < from) from = oldest;
  }
  return refreshProjectMetricsDaily({ projectId: params.projectId, from });
}
