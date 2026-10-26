import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";

import { METRICS_CONFIG } from "../config";
import type { ChannelMetricsResult, MetricsReportParams } from "../types";
import { channelLabel } from "../utils/channel-label";
import { periodDateSql, periodSql, resolveReportWindow } from "../utils/resolve-report-window";

type ChannelRow = {
  platform: string;
  source_type: string | null;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
};

type SourceRow = {
  id: string | null;
  name: string | null;
  platform: string | null;
  source_type: string | null;
  posts: number;
  mentions: number;
  engagement: number;
};

/**
 * Numbers of the Channels page for real projects over the period: mentions and sentiment
 * per channel, mentions per weekday and hour, and the sources with the most mentions.
 * Channels and sources are sums of L4 (D28); the hour × weekday heat reads L3. Only
 * relevant mentions count.
 */
export async function getChannelMetrics(
  params: MetricsReportParams,
): Promise<ChannelMetricsResult> {
  const window = await resolveReportWindow(params.projectId, params.period);
  const scope = sql`m.project_id = ${params.projectId}::uuid and m.is_relevant and ${ownMentionSql}
    and ${periodSql(window).current}`;
  const days = sql`d.project_id = ${params.projectId}::uuid and ${periodDateSql(window).current}`;

  const [{ rows: channelRows }, { rows: heatRows }, { rows: sourceRows }] = await Promise.all([
    db.execute<ChannelRow>(sql`
      select coalesce(s.platform, 'unknown') as platform, s.source_type,
        sum(d.mentions)::int as mentions,
        sum(d.positive)::int as positive,
        sum(d.neutral)::int as neutral,
        sum(d.negative)::int as negative
      from project_metrics_daily d
      left join sources s on s.id = d.source_id
      where ${days}
      group by 1, 2
      having sum(d.mentions) > 0
    `),
    db.execute<{ weekday: number; hour: number; mentions: number }>(sql`
      select (extract(isodow from m.published_at at time zone ${window.timezone}) - 1)::int as weekday,
        extract(hour from m.published_at at time zone ${window.timezone})::int as hour,
        count(*)::int as mentions
      from mentions m
      where ${scope}
      group by 1, 2
    `),
    db.execute<SourceRow>(sql`
      select d.source_id as id, s.name, s.platform, s.source_type,
        sum(d.posts)::int as posts,
        sum(d.mentions)::int as mentions,
        sum(d.engagement)::int as engagement
      from project_metrics_daily d
      left join sources s on s.id = d.source_id
      where ${days}
      group by d.source_id, s.name, s.platform, s.source_type
      having sum(d.mentions) > 0
      order by mentions desc, s.name
      limit ${METRICS_CONFIG.channelSources}
    `),
  ]);

  // Several platform/source type pairs can share a channel label (a Facebook page and profile).
  const channels = new Map<string, ChannelMetricsResult["channels"][number]>();
  for (const row of channelRows) {
    const channel = channelLabel(row.platform, row.source_type);
    const item = channels.get(channel) ?? { channel, mentions: 0, positive: 0, neutral: 0, negative: 0 };
    item.mentions += row.mentions;
    item.positive += row.positive;
    item.neutral += row.neutral;
    item.negative += row.negative;
    channels.set(channel, item);
  }

  return {
    period: window.info,
    timezone: window.timezone,
    channels: [...channels.values()].sort((a, b) => b.mentions - a.mentions),
    heat: heatRows,
    sources: sourceRows.map((row) => ({
      id: row.id,
      name: row.name ?? "Nguồn không rõ",
      channel: channelLabel(row.platform, row.source_type),
      posts: row.posts,
      mentions: row.mentions,
      engagement: row.engagement,
    })),
  };
}
