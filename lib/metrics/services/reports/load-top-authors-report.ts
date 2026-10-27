import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { Sentiment } from "@/lib/enrichment/config";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";

import { METRICS_CONFIG } from "../../config";
import { authorTier } from "../../formulas";
import type { ReportContext, ReportParamsMap, TopAuthorsReport } from "../../types";
import { channelLabel } from "../../utils/channel-label";
import { engagementSql } from "../../utils/engagement-sql";
import { periodSql } from "../../utils/resolve-report-window";

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

/** Authors of the period ranked by the engagement of their mentions (`limit`, default `topAuthors`); reads L3. */
export async function loadTopAuthorsReport(
  ctx: ReportContext,
  params: ReportParamsMap["top-authors"],
): Promise<TopAuthorsReport> {
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
    where m.project_id = ${ctx.projectId}::uuid and m.is_relevant
      and ${periodSql(ctx.window).current}
    group by a.id
    order by engagement desc, mentions desc, a.name
    limit ${params.limit ?? METRICS_CONFIG.topAuthors}
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "Không rõ tên",
    url: row.url,
    channel: channelLabel(row.platform, null),
    followers: row.follower_count,
    tier: authorTier({ followerCount: row.follower_count, authorType: row.author_type }),
    mentions: row.mentions,
    engagement: row.engagement,
    sentiment: row.sentiment,
  }));
}
