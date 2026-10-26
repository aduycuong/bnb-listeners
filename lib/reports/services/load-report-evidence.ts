import { sql } from "drizzle-orm";

import { safeSlice } from "@/lib/common/safe-slice";
import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";
import type { ReportPeriod } from "@/lib/metrics/types";
import { engagementSql } from "@/lib/metrics/utils/engagement-sql";
import { periodSql, resolveReportWindow } from "@/lib/metrics/utils/resolve-report-window";

import { REPORT_CONFIG } from "../config";
import type { ReportEvidence } from "../types";

type EvidenceRow = Omit<ReportEvidence, "label" | "aspects"> & { aspects: string[] | null };

function cut(text: string | null, length: number) {
  if (!text) return text;
  return text.length > length ? `${safeSlice(text, length)}…` : text;
}

/**
 * Sample mentions of the period the model may cite (D29): the most engaging, the most
 * engaging negative ones, the top of each big topic, and negative ones per aspect. Own
 * relevant mentions only, as in the reports (D26).
 */
export async function loadReportEvidence(params: {
  projectId: string;
  period: ReportPeriod;
}): Promise<ReportEvidence[]> {
  const window = await resolveReportWindow(params.projectId, params.period);
  const limits = REPORT_CONFIG.evidence;

  const { rows } = await db.execute<EvidenceRow>(sql`
    with base as (
      select m.id, m.kind, m.published_at, ${effectiveSentimentSql} as sentiment,
        ${engagementSql(sql`ci`)} as engagement, ci.text, ci.url, root.text as root_text,
        a.name as author, s.name as source,
        (select t.name from mention_topics mt join topics t on t.id = mt.topic_id
          where mt.mention_id = m.id and mt.kind = 'topic' and t.status = 'active' limit 1) as topic,
        (select array_agg(pa.name order by pa.sort_order) from mention_aspects ma
          join project_aspects pa on pa.id = ma.aspect_id where ma.mention_id = m.id) as aspects
      from mentions m
      join content_items ci on ci.id = m.content_item_id
      left join content_items root on root.id = m.root_item_id and m.root_item_id <> m.content_item_id
      left join authors a on a.id = m.author_id
      left join sources s on s.id = m.source_id
      ${effectiveSentimentJoins}
      where m.project_id = ${params.projectId}::uuid and m.is_relevant and ${ownMentionSql}
        and ${periodSql(window).current} and length(coalesce(ci.text, '')) > 0
    ),
    top_topics as (
      select topic from base where topic is not null
      group by topic order by count(*) desc limit ${limits.topics}
    ),
    picked as (
      (select id, 'engagement' as reason from base order by engagement desc, published_at desc limit ${limits.topEngagement})
      union all
      (select id, 'negative' from base where sentiment = 'negative'
        order by engagement desc, published_at desc limit ${limits.topNegative})
      union all
      select id, 'topic' from (
        select b.id, row_number() over (partition by b.topic order by b.engagement desc, b.published_at desc) as n
        from base b join top_topics tt on tt.topic = b.topic
      ) x where n <= ${limits.perTopic}
      union all
      select id, 'aspect' from (
        select b.id, row_number() over (partition by aspect order by b.engagement desc) as n
        from base b, unnest(b.aspects) aspect where b.sentiment = 'negative'
      ) x where n <= ${limits.perAspect}
    )
    select b.id as "mentionId", b.kind, b.text, b.root_text as "rootText", b.author, b.source,
      b.url, b.published_at as "publishedAt",
      b.sentiment, b.engagement::int as engagement, b.topic, b.aspects
    from (select distinct id from picked) p join base b on b.id = p.id
    order by b.engagement desc, b.published_at desc
    limit ${limits.maxEvidence}
  `);

  return rows.map((row, index) => ({
    label: `M${index + 1}`,
    mentionId: row.mentionId,
    kind: row.kind,
    text: cut(row.text, limits.textLength) ?? "",
    rootText: cut(row.rootText, limits.rootTextLength),
    author: row.author,
    source: row.source,
    url: row.url,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    sentiment: row.sentiment,
    engagement: row.engagement,
    topic: row.topic,
    aspects: row.aspects ?? [],
  }));
}
