import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { EMOTIONS, type Emotion } from "@/lib/enrichment/config";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
  emotionSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";

import { netSentimentScore, sharePercent } from "../formulas";
import type { MetricsReportParams, SentimentMetricsResult } from "../types";
import { loadDailySentiment } from "../utils/load-daily-sentiment";
import { loadReportWindow } from "../utils/load-report-window";

type AspectRow = { id: string; name: string; mentions: number; positive: number; negative: number };

/**
 * Numbers of the Sentiment page for real projects over the period: NSS per day, emotions,
 * and sentiment per aspect. Effective aspects follow D14: a label's aspect keys when the
 * item is labeled (with the mention's sentiment), else Enrich's aspects with their own
 * sentiment. Reads L3 directly until the L4 rollups exist.
 */
export async function getSentimentMetrics(
  params: MetricsReportParams,
): Promise<SentimentMetricsResult> {
  const window = await loadReportWindow(params.projectId, params.days);
  const start = sql`${window.start.toISOString()}::timestamptz`;
  const periodMentions = sql`
    select m.id, m.content_item_id, ${effectiveSentimentSql} as sentiment, ${emotionSql} as emotion
    from mentions m
    ${effectiveSentimentJoins}
    where m.project_id = ${params.projectId}::uuid and m.is_relevant and m.published_at >= ${start}
  `;

  const [daily, { rows: emotionRows }, { rows: aspectRows }] = await Promise.all([
    loadDailySentiment(params.projectId, window),
    db.execute<{ emotion: string; mentions: number }>(sql`
      select m.emotion, count(*)::int as mentions
      from (${periodMentions}) m
      where m.emotion is not null
      group by m.emotion
    `),
    db.execute<AspectRow>(sql`
      with pm as (${periodMentions}),
      effective as (
        select pm.id as mention_id, pa.id as aspect_id, pm.sentiment
        from pm
        join item_labels il on il.content_item_id = pm.content_item_id
          and il.project_id = ${params.projectId}::uuid and il.aspect_keys is not null
        join project_aspects pa on pa.project_id = ${params.projectId}::uuid
          and il.aspect_keys @> jsonb_build_array(pa.key)
        union all
        select pm.id, ma.aspect_id, coalesce(ma.sentiment, pm.sentiment)
        from pm
        join mention_aspects ma on ma.mention_id = pm.id
        where not exists (
          select 1 from item_labels il
          where il.content_item_id = pm.content_item_id
            and il.project_id = ${params.projectId}::uuid and il.aspect_keys is not null
        )
      )
      select pa.id, pa.name,
        count(e.mention_id)::int as mentions,
        (count(e.mention_id) filter (where e.sentiment = 'positive'))::int as positive,
        (count(e.mention_id) filter (where e.sentiment = 'negative'))::int as negative
      from project_aspects pa
      left join effective e on e.aspect_id = pa.id
      where pa.project_id = ${params.projectId}::uuid
      group by pa.id
      order by pa.sort_order, pa.name
    `),
  ]);

  const emotionCounts = new Map(emotionRows.map((row) => [row.emotion, row.mentions]));
  const emotionTotal = EMOTIONS.reduce((total, emotion) => total + (emotionCounts.get(emotion) ?? 0), 0);

  return {
    days: params.days,
    timezone: window.timezone,
    daily: daily.map((day) => ({ ...day, nss: netSentimentScore(day) })),
    emotions: EMOTIONS.map((emotion: Emotion) => {
      const mentions = emotionCounts.get(emotion) ?? 0;
      return { emotion, mentions, share: sharePercent(mentions, emotionTotal) ?? 0 };
    }),
    aspects: aspectRows.map((row) => ({
      id: row.id,
      name: row.name,
      mentions: row.mentions,
      positive: Math.round(sharePercent(row.positive, row.mentions) ?? 0),
      negative: Math.round(sharePercent(row.negative, row.mentions) ?? 0),
    })),
  };
}
