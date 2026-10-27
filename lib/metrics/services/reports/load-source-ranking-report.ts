import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { METRICS_CONFIG } from "../../config";
import type { ReportContext, ReportParamsMap, SourceRankingReport } from "../../types";
import { channelLabel } from "../../utils/channel-label";
import { periodDateSql } from "../../utils/resolve-report-window";

type SourceRow = {
  id: string | null;
  name: string | null;
  platform: string | null;
  source_type: string | null;
  posts: number;
  mentions: number;
  engagement: number;
};

/** Sources with the most mentions in the period (`limit`, default `channelSources`); sums of L4. */
export async function loadSourceRankingReport(
  ctx: ReportContext,
  params: ReportParamsMap["source-ranking"],
): Promise<SourceRankingReport> {
  const { rows } = await db.execute<SourceRow>(sql`
    select d.source_id as id, s.name, s.platform, s.source_type,
      sum(d.posts)::int as posts,
      sum(d.mentions)::int as mentions,
      sum(d.engagement)::int as engagement
    from project_metrics_daily d
    left join sources s on s.id = d.source_id
    where d.project_id = ${ctx.projectId}::uuid and ${periodDateSql(ctx.window).current}
    group by d.source_id, s.name, s.platform, s.source_type
    having sum(d.mentions) > 0
    order by mentions desc, s.name
    limit ${params.limit ?? METRICS_CONFIG.channelSources}
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "Nguồn không rõ",
    channel: channelLabel(row.platform, row.source_type),
    posts: row.posts,
    mentions: row.mentions,
    engagement: row.engagement,
  }));
}
