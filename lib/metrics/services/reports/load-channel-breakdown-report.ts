import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { ChannelBreakdownReport, ReportContext } from "../../types";
import { channelLabel } from "../../utils/channel-label";
import { periodDateSql } from "../../utils/resolve-report-window";

type ChannelRow = {
  platform: string;
  source_type: string | null;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
};

/** Mentions and sentiment of the period per channel, most first; sums of L4. */
export async function loadChannelBreakdownReport(ctx: ReportContext): Promise<ChannelBreakdownReport> {
  const { rows } = await db.execute<ChannelRow>(sql`
    select coalesce(s.platform, 'unknown') as platform, s.source_type,
      sum(d.mentions)::int as mentions,
      sum(d.positive)::int as positive,
      sum(d.neutral)::int as neutral,
      sum(d.negative)::int as negative
    from project_metrics_daily d
    left join sources s on s.id = d.source_id
    where d.project_id = ${ctx.projectId}::uuid and ${periodDateSql(ctx.window).current}
    group by 1, 2
    having sum(d.mentions) > 0
  `);

  // Several platform/source type pairs can share a channel label (a Facebook page and profile).
  const channels = new Map<string, ChannelBreakdownReport[number]>();
  for (const row of rows) {
    const channel = channelLabel(row.platform, row.source_type);
    const item = channels.get(channel) ?? { channel, mentions: 0, positive: 0, neutral: 0, negative: 0 };
    item.mentions += row.mentions;
    item.positive += row.positive;
    item.neutral += row.neutral;
    item.negative += row.negative;
    channels.set(channel, item);
  }
  return [...channels.values()].sort((a, b) => b.mentions - a.mentions);
}
