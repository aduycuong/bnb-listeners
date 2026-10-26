import { eq, sql, type SQL } from "drizzle-orm";

import { projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { brandCaseConfigSchema } from "@/lib/projects/case-templates";
import { parseProjectCase } from "@/lib/projects/project-cases";

import { METRICS_CONFIG } from "../config";
import { netSentimentScore, reputationIndex, reputationPillarScore } from "../formulas";
import type { BrandCaseMetricsResult, MetricsReportParams } from "../types";
import { loadReportWindow } from "../utils/load-report-window";

type Period = BrandCaseMetricsResult["period"];

const PERIOD_INTERVAL: Record<Period, string> = {
  week: "1 week",
  month: "1 month",
  quarter: "3 months",
};

type SentimentCounts = { positive: number; neutral: number; negative: number };

type AspectCountRow = SentimentCounts & {
  side: string;
  bucket: string;
  aspect_id: string;
};

type EntityRow = { id: string; role: string; name: string };

type EntityCountRow = SentimentCounts & { id: string; mentions: number };

/**
 * Numbers of the brand-case page (`Chỉ số uy tín`): the reputation index and its pillars,
 * NSS per project of the developer, share of voice against competitors, and the index over
 * the last report periods. Each project aspect is a pillar.
 *
 * The developer's side is every mention except those naming only competitors; mentions
 * naming one of its projects count for it. A competitor's side is the mentions naming that
 * competitor alone. Reads L3 directly. Only `case = brand`.
 */
export async function getBrandCaseMetrics(
  params: MetricsReportParams,
): Promise<BrandCaseMetricsResult> {
  const [project] = await db
    .select({
      name: projects.name,
      listeningCase: projects.listeningCase,
      caseConfig: projects.caseConfig,
    })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("Project", params.projectId);
  if (parseProjectCase(project.listeningCase) !== "brand") {
    throw new InvalidInputError("Trang Chỉ số uy tín chỉ có ở case Uy tín chủ đầu tư.");
  }

  const parsedConfig = brandCaseConfigSchema.safeParse(project.caseConfig);
  const period: Period = parsedConfig.success ? parsedConfig.data.period : "month";
  const window = await loadReportWindow(params.projectId, params.days);
  const start = sql`${window.start.toISOString()}::timestamptz`;
  const previousStart = sql`${window.previousStart.toISOString()}::timestamptz`;
  const tz = window.timezone;
  const unit = sql.raw(`'${period}'`);
  const step = sql.raw(`interval '${PERIOD_INTERVAL[period]}'`);

  const { rows: periodRows } = await db.execute<{ trend_start: string; starts: string[] }>(sql`
    with p as (
      select date_trunc(${unit}, now() at time zone ${tz})
        - ${METRICS_CONFIG.reputationTrendPeriods - 1}::int * ${step} as first
    )
    select first at time zone ${tz} as trend_start,
      array(
        select to_char(first + n * ${step}, 'YYYY-MM-DD')
        from generate_series(0, ${METRICS_CONFIG.reputationTrendPeriods - 1}::int) n
      ) as starts
    from p
  `);
  const trendStart = sql`${new Date(periodRows[0].trend_start).toISOString()}::timestamptz`;

  const [
    { rows: aspectRows },
    { rows: entityRows },
    { rows: entityCountRows },
    { rows: ownRows },
    { rows: windowRows },
    { rows: trendRows },
  ] = await Promise.all([
    db.execute<{ id: string; name: string }>(sql`
      select id, name from project_aspects
      where project_id = ${params.projectId}::uuid
      order by sort_order, name
    `),
    db.execute<EntityRow>(sql`
      select id, role, name from project_entities
      where project_id = ${params.projectId}::uuid
        and role in ('primary', 'product', 'competitor')
      order by sort_order, name
    `),
    db.execute<EntityCountRow>(sql`
      select me.entity_id as id, count(*)::int as mentions,
        (count(*) filter (where me.sentiment = 'positive'))::int as positive,
        (count(*) filter (where me.sentiment = 'neutral'))::int as neutral,
        (count(*) filter (where me.sentiment = 'negative'))::int as negative
      from mention_entities me
      join mentions m on m.id = me.mention_id
      where m.project_id = ${params.projectId}::uuid and m.is_relevant
        and m.published_at >= ${start}
      group by me.entity_id
    `),
    db.execute<{ mentions: number }>(sql`
      select count(distinct me.mention_id)::int as mentions
      from mention_entities me
      join project_entities pe on pe.id = me.entity_id
      join mentions m on m.id = me.mention_id
      where m.project_id = ${params.projectId}::uuid and m.is_relevant
        and m.published_at >= ${start}
        and pe.role in ('primary', 'product')
    `),
    loadAspectCounts(
      params.projectId,
      previousStart,
      sql`case when m.published_at >= ${start} then 'current' else 'previous' end`,
    ),
    loadAspectCounts(
      params.projectId,
      trendStart,
      sql`to_char(date_trunc(${unit}, m.published_at at time zone ${tz}), 'YYYY-MM-DD')`,
    ),
  ]);

  const primary = entityRows.find((row) => row.role === "primary");
  const competitors = entityRows.filter((row) => row.role === "competitor");
  const countsById = new Map(entityCountRows.map((row) => [row.id, row]));
  const aspectIds = aspectRows.map((row) => row.id);

  const pillars = aspectRows.map((aspect) => {
    const counts = sumCounts(
      windowRows.filter(
        (row) => row.side === "primary" && row.bucket === "current" && row.aspect_id === aspect.id,
      ),
    );
    return {
      id: aspect.id,
      name: aspect.name,
      mentions: counts.positive + counts.neutral + counts.negative,
      score: reputationPillarScore(counts),
    };
  });

  const trend = periodRows[0].starts.map((periodStart) => {
    const ofPeriod = trendRows.filter((row) => row.bucket === periodStart);
    const competitorScores = competitors
      .map((competitor) => sideIndex(ofPeriod, competitor.id, aspectIds))
      .filter((score): score is number => score !== null);
    return {
      start: periodStart,
      primary: sideIndex(ofPeriod, "primary", aspectIds),
      competitors: reputationIndex(competitorScores),
    };
  });

  return {
    days: params.days,
    timezone: tz,
    primaryName: primary?.name ?? project.name,
    hasCompetitors: competitors.length > 0,
    index: {
      current: reputationIndex(pillars.map((pillar) => pillar.score)),
      previous: sideIndex(
        windowRows.filter((row) => row.bucket === "previous"),
        "primary",
        aspectIds,
      ),
    },
    pillars,
    products: entityRows
      .filter((row) => row.role === "product")
      .map((row) => {
        const counts = countsById.get(row.id);
        return {
          id: row.id,
          name: row.name,
          mentions: counts?.mentions ?? 0,
          nss: counts ? netSentimentScore(counts) : null,
        };
      })
      .sort((a, b) => b.mentions - a.mentions),
    shareOfVoice: [
      {
        id: primary?.id ?? params.projectId,
        name: primary?.name ?? project.name,
        role: "primary" as const,
        mentions: ownRows[0]?.mentions ?? 0,
      },
      ...competitors.map((row) => ({
        id: row.id,
        name: row.name,
        role: "competitor" as const,
        mentions: countsById.get(row.id)?.mentions ?? 0,
      })),
    ],
    period,
    trend,
  };
}

function sumCounts(rows: SentimentCounts[]): SentimentCounts {
  return rows.reduce(
    (sum, row) => ({
      positive: sum.positive + row.positive,
      neutral: sum.neutral + row.neutral,
      negative: sum.negative + row.negative,
    }),
    { positive: 0, neutral: 0, negative: 0 },
  );
}

/** Reputation index of one side (`primary` or a competitor id) over the given rows. */
function sideIndex(rows: AspectCountRow[], side: string, aspectIds: string[]) {
  return reputationIndex(
    aspectIds.map((aspectId) =>
      reputationPillarScore(
        sumCounts(rows.filter((row) => row.side === side && row.aspect_id === aspectId)),
      ),
    ),
  );
}

/**
 * Aspect sentiment counts per side and bucket since `from`. Aspects follow D17: the label's
 * aspects with the mention's sentiment when the item is labelled, else Enrich's aspects with
 * their own sentiment. Mentions naming several competitors and nothing of the developer count
 * for no side.
 */
function loadAspectCounts(projectId: string, from: SQL, bucket: SQL) {
  return db.execute<AspectCountRow>(sql`
    with sides as (
      select me.mention_id,
        bool_or(pe.role in ('primary', 'product')) as own,
        (count(*) filter (where pe.role = 'competitor'))::int as competitors,
        (array_agg(pe.id::text) filter (where pe.role = 'competitor'))[1] as competitor_id
      from mention_entities me
      join project_entities pe on pe.id = me.entity_id
      where pe.project_id = ${projectId}::uuid
      group by me.mention_id
    ),
    pm as (
      select m.id, m.content_item_id, ${effectiveSentimentSql} as sentiment, ${bucket} as bucket,
        case
          when s.mention_id is null or s.own then 'primary'
          when s.competitors = 1 then s.competitor_id
        end as side
      from mentions m
      ${effectiveSentimentJoins}
      left join sides s on s.mention_id = m.id
      where m.project_id = ${projectId}::uuid and m.is_relevant and m.published_at >= ${from}
    ),
    effective as (
      select pm.side, pm.bucket, pa.id as aspect_id, pm.sentiment
      from pm
      join item_labels il on il.content_item_id = pm.content_item_id
        and il.project_id = ${projectId}::uuid and il.aspect_keys is not null
      join project_aspects pa on pa.project_id = ${projectId}::uuid
        and il.aspect_keys @> jsonb_build_array(pa.key)
      where pm.side is not null
      union all
      select pm.side, pm.bucket, ma.aspect_id, coalesce(ma.sentiment, pm.sentiment)
      from pm
      join mention_aspects ma on ma.mention_id = pm.id
      where pm.side is not null and not exists (
        select 1 from item_labels il
        where il.content_item_id = pm.content_item_id
          and il.project_id = ${projectId}::uuid and il.aspect_keys is not null
      )
    )
    select side, bucket, aspect_id,
      (count(*) filter (where sentiment = 'positive'))::int as positive,
      (count(*) filter (where sentiment = 'neutral'))::int as neutral,
      (count(*) filter (where sentiment = 'negative'))::int as negative
    from effective
    group by side, bucket, aspect_id
  `);
}
