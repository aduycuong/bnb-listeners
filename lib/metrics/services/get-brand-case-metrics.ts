import { eq, sql, type SQL } from "drizzle-orm";

import { projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { brandCaseConfigSchema } from "@/lib/projects/case-templates";
import { parseProjectCase } from "@/lib/projects/project-cases";

import { METRICS_CONFIG } from "../config";
import { netSentimentScore, reputationIndex, reputationPillarScore } from "../formulas";
import type { BrandCaseMetricsResult, MetricsReportParams } from "../types";
import { periodDateSql, periodSql, resolveReportWindow } from "../utils/resolve-report-window";

type Period = BrandCaseMetricsResult["trendPeriod"];

const PERIOD_INTERVAL: Record<Period, string> = {
  week: "1 week",
  month: "1 month",
  quarter: "3 months",
};

type SentimentCounts = { positive: number; neutral: number; negative: number };

type AspectCountRow = SentimentCounts & { bucket: string; aspect_id: string };

type ProductRow = SentimentCounts & { id: string; name: string; mentions: number };

/**
 * Numbers of the brand-case page (`Chỉ số uy tín`): the reputation index and its pillars, NSS
 * per project of the developer and the index over the last report periods. Each project aspect
 * is a pillar. Every relevant mention is about the developer or one of its projects (D30), so
 * pillars and the trend are sums of L4 (`project_aspect_daily`); NSS per project reads the
 * sentiment Enrich gave each `product` entity (`mention_entities`). Only `case = brand`.
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
  const window = await resolveReportWindow(params.projectId, params.period);
  const days = periodDateSql(window);
  const tz = window.timezone;
  const unit = sql.raw(`'${period}'`);
  const step = sql.raw(`interval '${PERIOD_INTERVAL[period]}'`);

  const { rows: periodRows } = await db.execute<{ starts: string[] }>(sql`
    with p as (
      select date_trunc(${unit}, now() at time zone ${tz})
        - ${METRICS_CONFIG.reputationTrendPeriods - 1}::int * ${step} as first
    )
    select array(
      select to_char(first + n * ${step}, 'YYYY-MM-DD')
      from generate_series(0, ${METRICS_CONFIG.reputationTrendPeriods - 1}::int) n
    ) as starts
    from p
  `);
  const starts = periodRows[0].starts;

  const [
    { rows: aspectRows },
    { rows: subjectRows },
    { rows: productRows },
    { rows: windowRows },
    { rows: trendRows },
  ] = await Promise.all([
    db.execute<{ id: string; name: string }>(sql`
      select id, name from project_aspects
      where project_id = ${params.projectId}::uuid
      order by sort_order, name
    `),
    db.execute<{ name: string }>(sql`
      select name from project_entities
      where project_id = ${params.projectId}::uuid and role = 'subject'
      limit 1
    `),
    db.execute<ProductRow>(sql`
      select pe.id, pe.name,
        count(m.id)::int as mentions,
        (count(m.id) filter (where me.sentiment = 'positive'))::int as positive,
        (count(m.id) filter (where me.sentiment = 'neutral'))::int as neutral,
        (count(m.id) filter (where me.sentiment = 'negative'))::int as negative
      from project_entities pe
      left join mention_entities me on me.entity_id = pe.id
      left join mentions m on m.id = me.mention_id and m.is_relevant
        and ${periodSql(window).current}
      where pe.project_id = ${params.projectId}::uuid and pe.role = 'product'
      group by pe.id
      order by mentions desc, pe.sort_order, pe.name
    `),
    loadAspectCounts(
      params.projectId,
      days.either,
      sql`case when ${days.current} then 'current' else 'previous' end`,
    ),
    loadAspectCounts(
      params.projectId,
      sql`d.date_key >= ${starts[0]}::date`,
      sql`to_char(date_trunc(${unit}, d.date_key), 'YYYY-MM-DD')`,
    ),
  ]);

  const aspectIds = aspectRows.map((row) => row.id);
  const pillars = aspectRows.map((aspect) => {
    const counts = sumCounts(
      windowRows.filter((row) => row.bucket === "current" && row.aspect_id === aspect.id),
    );
    return {
      id: aspect.id,
      name: aspect.name,
      mentions: counts.positive + counts.neutral + counts.negative,
      score: reputationPillarScore(counts),
    };
  });

  return {
    period: window.info,
    timezone: tz,
    subjectName: subjectRows[0]?.name ?? project.name,
    index: {
      current: reputationIndex(pillars.map((pillar) => pillar.score)),
      previous: bucketIndex(windowRows, "previous", aspectIds),
    },
    pillars,
    products: productRows.map((row) => ({
      id: row.id,
      name: row.name,
      mentions: row.mentions,
      nss: row.mentions ? netSentimentScore(row) : null,
    })),
    trendPeriod: period,
    trend: starts.map((start) => ({ start, index: bucketIndex(trendRows, start, aspectIds) })),
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

/** Reputation index of one bucket over the given rows. */
function bucketIndex(rows: AspectCountRow[], bucket: string, aspectIds: string[]) {
  return reputationIndex(
    aspectIds.map((aspectId) =>
      reputationPillarScore(
        sumCounts(rows.filter((row) => row.bucket === bucket && row.aspect_id === aspectId)),
      ),
    ),
  );
}

/** Aspect sentiment counts per bucket over the L4 days in range (aspects follow D14). */
function loadAspectCounts(projectId: string, inRange: SQL, bucket: SQL) {
  return db.execute<AspectCountRow>(sql`
    select ${bucket} as bucket, d.aspect_id,
      sum(d.positive)::int as positive,
      sum(d.neutral)::int as neutral,
      sum(d.negative)::int as negative
    from project_aspect_daily d
    where d.project_id = ${projectId}::uuid and ${inRange}
    group by 1, 2
  `);
}
