import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { EMOTIONS, type Emotion } from "@/lib/enrichment/config";

import { netSentimentScore, sharePercent } from "../formulas";
import type { MetricsReportParams, SentimentMetricsResult } from "../types";
import { loadDailySentiment } from "../utils/load-daily-sentiment";
import { periodDateSql, resolveReportWindow } from "../utils/resolve-report-window";

type AspectRow = { id: string; name: string; mentions: number; positive: number; negative: number };

/**
 * Numbers of the Sentiment page for real projects over the period: NSS per day, emotions,
 * and sentiment per aspect, all sums of L4 (D28). Effective aspects follow D14 and are
 * resolved when L4 is written: a label's aspect keys when the item is labeled (with the
 * mention's sentiment), else Enrich's aspects with their own sentiment.
 */
export async function getSentimentMetrics(
  params: MetricsReportParams,
): Promise<SentimentMetricsResult> {
  const window = await resolveReportWindow(params.projectId, params.period);
  const inPeriod = periodDateSql(window).current;

  const [daily, { rows: emotionRows }, { rows: aspectRows }] = await Promise.all([
    loadDailySentiment(params.projectId, window),
    db.execute<{ emotion: string; mentions: number }>(sql`
      select e.key as emotion, sum(e.value::int)::int as mentions
      from project_metrics_daily d, jsonb_each_text(d.emotions) e
      where d.project_id = ${params.projectId}::uuid and ${inPeriod}
      group by e.key
    `),
    db.execute<AspectRow>(sql`
      select pa.id, pa.name,
        coalesce(sum(d.mentions), 0)::int as mentions,
        coalesce(sum(d.positive), 0)::int as positive,
        coalesce(sum(d.negative), 0)::int as negative
      from project_aspects pa
      left join project_aspect_daily d on d.aspect_id = pa.id and ${inPeriod}
      where pa.project_id = ${params.projectId}::uuid
      group by pa.id
      order by pa.sort_order, pa.name
    `),
  ]);
  const emotionCounts = new Map(emotionRows.map((row) => [row.emotion, row.mentions]));
  const emotionTotal = EMOTIONS.reduce((total, emotion) => total + (emotionCounts.get(emotion) ?? 0), 0);

  return {
    period: window.info,
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
