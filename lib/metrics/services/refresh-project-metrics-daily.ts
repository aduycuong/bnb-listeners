import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
  emotionSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";

import type { RefreshProjectMetricsDailyParams, RefreshProjectMetricsDailyResult } from "../types";
import { engagementSql } from "../utils/engagement-sql";

/**
 * Rewrites the L4 rows of a project (D28): `project_metrics_daily` and
 * `project_aspect_daily` for the whole days of the project's timezone that hold `from` and
 * `to`, or for every day when both are left out. One statement per table upserts the new
 * rows and deletes the rows of those days that no longer have mentions, so running it again
 * gives the same rows and two refreshes at once do not add a day twice.
 */
export async function refreshProjectMetricsDaily(
  params: RefreshProjectMetricsDailyParams,
): Promise<RefreshProjectMetricsDailyResult> {
  const { projectId } = params;
  const tz = sql`(select timezone from projects where id = ${projectId}::uuid)`;
  const fromKey = params.from
    ? sql`(${params.from.toISOString()}::timestamptz at time zone ${tz})::date`
    : null;
  const toKey = params.to
    ? sql`(${params.to.toISOString()}::timestamptz at time zone ${tz})::date`
    : null;
  const rowRange = sql`${fromKey ? sql`and t.date_key >= ${fromKey}` : sql``}
    ${toKey ? sql`and t.date_key <= ${toKey}` : sql``}`;
  const mentionRange = sql`${fromKey ? sql`and m.published_at >= (${fromKey}::timestamp at time zone ${tz})` : sql``}
    ${toKey ? sql`and m.published_at < ((${toKey} + 1)::timestamp at time zone ${tz})` : sql``}`;

  const base = sql`
    select m.id, m.content_item_id, m.source_id, m.kind,
      (m.published_at at time zone ${tz})::date as date_key,
      ${ownMentionSql} as own,
      ${effectiveSentimentSql} as sentiment,
      ${emotionSql} as emotion,
      ${engagementSql(sql`ci`)} as engagement,
      exists (
        select 1 from mention_entities me join project_entities pe on pe.id = me.entity_id
        where me.mention_id = m.id and pe.role in ('primary', 'product')
      ) as sov_primary,
      exists (
        select 1 from mention_entities me join project_entities pe on pe.id = me.entity_id
        where me.mention_id = m.id and pe.role in ('primary', 'product', 'competitor')
      ) as sov_tracked
    from mentions m
    join content_items ci on ci.id = m.content_item_id
    ${effectiveSentimentJoins}
    where m.project_id = ${projectId}::uuid and m.is_relevant and m.published_at is not null
      ${mentionRange}
  `;

  const [{ rows: metricRows }, { rows: aspectRows }] = await Promise.all([
    db.execute<{ count: number }>(sql`
      with base as (${base}),
      emotions as (
        select date_key, source_id, jsonb_object_agg(emotion, n) as emotions
        from (
          select date_key, source_id, emotion, count(*)::int as n
          from base where own and emotion is not null
          group by 1, 2, 3
        ) e
        group by 1, 2
      ),
      agg as (
        select b.date_key, b.source_id,
          (count(*) filter (where b.own))::int as mentions,
          (count(*) filter (where b.own and b.kind = 'post'))::int as posts,
          coalesce(sum(b.engagement) filter (where b.own), 0)::int as engagement,
          (count(*) filter (where b.own and b.sentiment = 'positive'))::int as positive,
          (count(*) filter (where b.own and b.sentiment = 'neutral'))::int as neutral,
          (count(*) filter (where b.own and b.sentiment = 'negative'))::int as negative,
          (count(*) filter (where b.own and b.sentiment is null))::int as unknown,
          coalesce(min(e.emotions::text)::jsonb, '{}'::jsonb) as emotions,
          (count(*) filter (where b.sov_primary))::int as sov_primary,
          (count(*) filter (where b.sov_tracked))::int as sov_tracked
        from base b
        left join emotions e on e.date_key = b.date_key
          and e.source_id is not distinct from b.source_id
        group by b.date_key, b.source_id
      ),
      removed as (
        delete from project_metrics_daily t
        where t.project_id = ${projectId}::uuid ${rowRange}
          and not exists (
            select 1 from agg
            where agg.date_key = t.date_key and agg.source_id is not distinct from t.source_id
          )
      ),
      upserted as (
        insert into project_metrics_daily (
          project_id, date_key, source_id, mentions, posts, engagement,
          positive, neutral, negative, unknown, emotions, sov_primary, sov_tracked
        )
        select ${projectId}::uuid, date_key, source_id, mentions, posts, engagement,
          positive, neutral, negative, unknown, emotions, sov_primary, sov_tracked
        from agg
        on conflict on constraint project_metrics_daily_key do update set
          mentions = excluded.mentions, posts = excluded.posts, engagement = excluded.engagement,
          positive = excluded.positive, neutral = excluded.neutral, negative = excluded.negative,
          unknown = excluded.unknown, emotions = excluded.emotions,
          sov_primary = excluded.sov_primary, sov_tracked = excluded.sov_tracked,
          computed_at = now()
        returning 1
      )
      select count(*)::int as count from upserted
    `),
    db.execute<{ count: number }>(sql`
      with own as (select * from (${base}) b where b.own),
      effective as (
        select own.date_key, pa.id as aspect_id, own.sentiment
        from own
        join item_labels il on il.content_item_id = own.content_item_id
          and il.project_id = ${projectId}::uuid and il.aspect_keys is not null
        join project_aspects pa on pa.project_id = ${projectId}::uuid
          and il.aspect_keys @> jsonb_build_array(pa.key)
        union all
        select own.date_key, ma.aspect_id, coalesce(ma.sentiment, own.sentiment)
        from own
        join mention_aspects ma on ma.mention_id = own.id
        where not exists (
          select 1 from item_labels il
          where il.content_item_id = own.content_item_id
            and il.project_id = ${projectId}::uuid and il.aspect_keys is not null
        )
      ),
      agg as (
        select date_key, aspect_id, count(*)::int as mentions,
          (count(*) filter (where sentiment = 'positive'))::int as positive,
          (count(*) filter (where sentiment = 'neutral'))::int as neutral,
          (count(*) filter (where sentiment = 'negative'))::int as negative
        from effective
        group by date_key, aspect_id
      ),
      removed as (
        delete from project_aspect_daily t
        where t.project_id = ${projectId}::uuid ${rowRange}
          and not exists (
            select 1 from agg where agg.date_key = t.date_key and agg.aspect_id = t.aspect_id
          )
      ),
      upserted as (
        insert into project_aspect_daily (
          project_id, date_key, aspect_id, mentions, positive, neutral, negative
        )
        select ${projectId}::uuid, date_key, aspect_id, mentions, positive, neutral, negative
        from agg
        on conflict on constraint project_aspect_daily_key do update set
          mentions = excluded.mentions, positive = excluded.positive,
          neutral = excluded.neutral, negative = excluded.negative, computed_at = now()
        returning 1
      )
      select count(*)::int as count from upserted
    `),
  ]);

  return { metricRows: metricRows[0]?.count ?? 0, aspectRows: aspectRows[0]?.count ?? 0 };
}
