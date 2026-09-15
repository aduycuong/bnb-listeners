import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  DashboardDailyIngestionPoint,
  GetDashboardOverviewResult,
} from "../types";

type CountRow = { count: number };
type DailyRow = { date_key: string; doc_count: number };

export async function getDashboardOverview(
  ctx: WorkspaceContext,
): Promise<GetDashboardOverviewResult> {
  const [docsResult, dataSourcesResult, newDocsResult, dailyResult] =
    await Promise.all([
      db.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count
        FROM documents
        WHERE workspace_id = ${ctx.workspaceId}::uuid
      `),
      db.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count
        FROM data_sources
        WHERE workspace_id = ${ctx.workspaceId}::uuid
      `),
      db.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count
        FROM documents
        WHERE workspace_id = ${ctx.workspaceId}::uuid
          AND created_at >= NOW() - INTERVAL '30 days'
      `),
      db.execute<DailyRow>(sql`
        SELECT
          DATE(created_at)::text AS date_key,
          COUNT(*)::int AS doc_count
        FROM documents
        WHERE workspace_id = ${ctx.workspaceId}::uuid
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date_key ASC
      `),
    ]);

  const dailyByDate = new Map(
    dailyResult.rows.map((row) => [row.date_key, row.doc_count]),
  );

  // Fill all 30 days so the chart has no gaps
  const daily: DashboardDailyIngestionPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ dateKey: key, docCount: dailyByDate.get(key) ?? 0 });
  }

  return {
    totalDocuments: docsResult.rows[0]?.count ?? 0,
    totalDataSources: dataSourcesResult.rows[0]?.count ?? 0,
    newDocumentsLast30Days: newDocsResult.rows[0]?.count ?? 0,
    dailyIngestion: daily,
  };
}
