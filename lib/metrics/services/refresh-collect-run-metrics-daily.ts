import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { RefreshProjectMetricsDailyResult } from "../types";
import { refreshProjectMetricsDaily } from "./refresh-project-metrics-daily";

/**
 * L4 refresh after a collect run that only updated items (D28): a refresh of likes, comments
 * and shares adds nothing, so no Match or Enrich runs, but engagement in L4 changed. Rewrites,
 * for each project following the run's source, the days of its mentions the run rewrote
 * (`content_items.collect_run_id` is the last run that wrote the item).
 */
export async function refreshCollectRunMetricsDaily(params: {
  collectRunId: string;
}): Promise<{ projects: number } & RefreshProjectMetricsDailyResult> {
  const { rows } = await db.execute<{ project_id: string; oldest: string; newest: string }>(sql`
    select m.project_id, min(m.published_at) as oldest, max(m.published_at) as newest
    from content_items ci
    join mentions m on m.content_item_id = ci.id and m.is_relevant
    where ci.collect_run_id = ${params.collectRunId}::uuid and m.published_at is not null
    group by m.project_id
  `);

  let metricRows = 0;
  let aspectRows = 0;
  for (const row of rows) {
    const result = await refreshProjectMetricsDaily({
      projectId: row.project_id,
      from: new Date(row.oldest),
      to: new Date(row.newest),
    });
    metricRows += result.metricRows;
    aspectRows += result.aspectRows;
  }
  return { projects: rows.length, metricRows, aspectRows };
}
