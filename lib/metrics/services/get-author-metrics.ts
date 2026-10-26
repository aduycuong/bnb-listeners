import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Sentiment } from "@/lib/enrichment/config";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";

import { AUTHOR_TIERS, METRICS_CONFIG, type AuthorTier } from "../config";
import { authorTier } from "../formulas";
import type { AuthorMetricsResult, MetricsReportParams } from "../types";
import { channelLabel } from "../utils/channel-label";
import { engagementSql } from "../utils/engagement-sql";
import { loadReportWindow } from "../utils/load-report-window";

type AuthorRow = {
  id: string;
  name: string | null;
  url: string | null;
  platform: string;
  follower_count: number | null;
  author_type: string | null;
  mentions: number;
  engagement: number;
  sentiment: Sentiment | null;
};

/**
 * Numbers of the Authors page for real projects over the period: authors ranked by the
 * engagement of their mentions, and authors per group (`AUTHOR_TIERS`). Reads L3 directly;
 * every author of the period is loaded, which is fine until the L4 rollups exist.
 */
export async function getAuthorMetrics(params: MetricsReportParams): Promise<AuthorMetricsResult> {
  const window = await loadReportWindow(params.projectId, params.days);
  const { rows } = await db.execute<AuthorRow>(sql`
    select a.id, a.name, a.url, a.platform,
      a.follower_count, a.author_type,
      count(*)::int as mentions,
      coalesce(sum(${engagementSql(sql`ci`)}), 0)::int as engagement,
      mode() within group (order by ${effectiveSentimentSql})
        filter (where ${effectiveSentimentSql} is not null) as sentiment
    from mentions m
    join authors a on a.id = m.author_id
    join content_items ci on ci.id = m.content_item_id
    ${effectiveSentimentJoins}
    where m.project_id = ${params.projectId}::uuid and m.is_relevant and ${ownMentionSql}
      and m.published_at >= ${window.start.toISOString()}::timestamptz
    group by a.id
    order by engagement desc, mentions desc, a.name
  `);

  const tierCounts = new Map<AuthorTier, number>();
  const items = rows.map((row) => {
    const tier = authorTier({ followerCount: row.follower_count, authorType: row.author_type });
    tierCounts.set(tier, (tierCounts.get(tier) ?? 0) + 1);
    return {
      id: row.id,
      name: row.name ?? "Không rõ tên",
      url: row.url,
      channel: channelLabel(row.platform, null),
      followers: row.follower_count,
      tier,
      mentions: row.mentions,
      engagement: row.engagement,
      sentiment: row.sentiment,
    };
  });

  return {
    days: params.days,
    timezone: window.timezone,
    items: items.slice(0, METRICS_CONFIG.topAuthors),
    tiers: AUTHOR_TIERS.map(({ key }) => ({ tier: key, authors: tierCounts.get(key) ?? 0 })),
    withoutFollowers: rows.filter((row) => row.follower_count === null).length,
  };
}
