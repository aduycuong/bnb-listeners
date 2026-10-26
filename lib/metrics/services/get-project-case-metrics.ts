import { eq, sql } from "drizzle-orm";

import { projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";
import { projectCaseConfigSchema } from "@/lib/projects/case-templates";
import { parseProjectCase } from "@/lib/projects/project-cases";

import { METRICS_CONFIG } from "../config";
import { netSentimentScore } from "../formulas";
import type { MetricsReportParams, ProjectCaseMetricsResult } from "../types";
import { loadReportWindow } from "../utils/load-report-window";

type QuoteRow = {
  mention_id: string;
  author_id: string | null;
  day: string;
  amount: number;
  role: "primary" | "competitor" | null;
};

type QuestionRow = { id: string; name: string; mentions: number };

type AspectNssRow = {
  id: string;
  name: string;
  sort_order: number;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
};

type EntityRow = { role: string; name: string; count: number };

/**
 * Numbers of the project-case page (`Chi tiết dự án`): resale prices, grouped
 * buyer questions, and aspect NSS of the primary project versus competitors.
 * `price.median` is the tracked project only. Question totals cover this period
 * and the one before.
 * Reads L3 directly. Only `case = project`.
 */
export async function getProjectCaseMetrics(
  params: MetricsReportParams,
): Promise<ProjectCaseMetricsResult> {
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
  if (parseProjectCase(project.listeningCase) !== "project") {
    throw new InvalidInputError("Trang Chi tiết dự án chỉ có ở case Theo dõi dự án.");
  }

  const window = await loadReportWindow(params.projectId, params.days);
  const start = sql`${window.start.toISOString()}::timestamptz`;
  const previousStart = sql`${window.previousStart.toISOString()}::timestamptz`;
  const tz = window.timezone;
  const parsedConfig = projectCaseConfigSchema.safeParse(project.caseConfig);
  const priceRef = parsedConfig.success ? (parsedConfig.data.priceRef ?? null) : null;

  const [
    { rows: entityRows },
    { rows: quoteRows },
    { rows: questionRows },
    { rows: questionTotalRows },
    { rows: primaryAspectRows },
    { rows: competitorAspectRows },
  ] = await Promise.all([
    db.execute<EntityRow>(sql`
      select role, min(name) as name, count(*)::int as count
      from project_entities
      where project_id = ${params.projectId}::uuid and role in ('primary', 'competitor')
      group by role
    `),
    db.execute<QuoteRow>(sql`
      with quotes as (
        select m.id as mention_id, m.author_id,
          to_char(m.published_at at time zone ${tz}, 'YYYY-MM-DD') as day,
          (x.data->>'amount')::double precision as amount
        from mention_extractions x
        join mentions m on m.id = x.mention_id
        where m.project_id = ${params.projectId}::uuid and m.is_relevant
          and x.schema_key = 'price_quote'
          and x.data->>'unit' = 'trieu_m2'
          and x.data->>'kind' = 'rao_ban'
          and jsonb_typeof(x.data->'amount') = 'number'
          and m.published_at >= ${previousStart}
      ),
      assigned as (
        select me.mention_id, min(pe.role) as role
        from mention_entities me
        join project_entities pe on pe.id = me.entity_id
        where pe.project_id = ${params.projectId}::uuid
          and pe.role in ('primary', 'competitor')
        group by me.mention_id
        having count(*) = 1
      )
      select q.mention_id, q.author_id, q.day, q.amount,
        a.role as role
      from quotes q
      left join assigned a on a.mention_id = q.mention_id
    `),
    db.execute<QuestionRow>(sql`
      select t.id, t.name, count(*)::int as mentions
      from topics t
      join mention_topics mt on mt.topic_id = t.id and mt.kind = 'buyer_question'
      join mentions m on m.id = mt.mention_id and m.is_relevant and ${ownMentionSql}
      where t.project_id = ${params.projectId}::uuid
        and t.kind = 'buyer_question' and t.status = 'active'
        and m.published_at >= ${start}
      group by t.id
      order by mentions desc, t.name
      limit ${METRICS_CONFIG.topBuyerQuestions}
    `),
    db.execute<{ current_count: number; previous_count: number }>(sql`
      select
        count(*) filter (where m.published_at >= ${start})::int as current_count,
        count(*) filter (where m.published_at < ${start})::int as previous_count
      from mention_extractions x
      join mentions m on m.id = x.mention_id
      where m.project_id = ${params.projectId}::uuid and m.is_relevant and ${ownMentionSql}
        and x.schema_key = 'buyer_question'
        and m.published_at >= ${previousStart}
    `),
    loadAspectNss(params.projectId, start, "primary"),
    loadAspectNss(params.projectId, start, "competitor"),
  ]);

  const primaryName =
    entityRows.find((row) => row.role === "primary")?.name ?? project.name;
  const hasCompetitors = (entityRows.find((row) => row.role === "competitor")?.count ?? 0) > 0;
  const currentDays = new Set(window.dates);
  const unique = dedupeQuotes(quoteRows.filter((row) => row.role !== null));
  const kept = filterOutliers(unique);
  const currentKept = kept.filter((row) => currentDays.has(row.day));
  const previousKept = kept.filter((row) => !currentDays.has(row.day));

  const daily = window.dates.map((date) => {
    const ofDay = currentKept.filter((row) => row.day === date);
    return {
      date,
      primary: median(ofDay.filter((row) => row.role === "primary").map((row) => row.amount)),
      competitor: median(ofDay.filter((row) => row.role === "competitor").map((row) => row.amount)),
      priceRef,
    };
  });

  const competitorById = new Map(
    competitorAspectRows.map((row) => [row.id, netSentimentScore(row)]),
  );

  return {
    days: params.days,
    timezone: window.timezone,
    primaryName,
    hasCompetitors,
    price: {
      daily,
      median: {
        current: median(amountsOf(currentKept, "primary")),
        previous: median(amountsOf(previousKept, "primary")),
      },
      priceRef,
      buckets: priceBuckets(currentKept.map((row) => row.amount)),
      quotes: quoteRows.filter((row) => currentDays.has(row.day)).length,
      used: currentKept.length,
      droppedMultiEntity: quoteRows.filter((row) => currentDays.has(row.day) && row.role === null)
        .length,
      droppedOutlier: unique.filter((row) => currentDays.has(row.day)).length - currentKept.length,
    },
    questions: {
      total: {
        current: questionTotalRows[0]?.current_count ?? 0,
        previous: questionTotalRows[0]?.previous_count ?? 0,
      },
      items: questionRows,
    },
    aspects: primaryAspectRows.map((row) => ({
      id: row.id,
      name: row.name,
      primary: netSentimentScore(row),
      competitor: hasCompetitors ? (competitorById.get(row.id) ?? null) : null,
    })),
  };
}

async function loadAspectNss(
  projectId: string,
  start: ReturnType<typeof sql>,
  side: "primary" | "competitor",
) {
  const entityFilter =
    side === "primary"
      ? sql`true`
      : sql`exists (
          select 1
          from (
            select me.mention_id
            from mention_entities me
            join project_entities pe on pe.id = me.entity_id
            where pe.project_id = ${projectId}::uuid
              and pe.role in ('primary', 'competitor')
            group by me.mention_id
            having count(*) = 1 and min(pe.role) = 'competitor'
          ) only_competitor
          where only_competitor.mention_id = pm.id
        )`;

  return db.execute<AspectNssRow>(sql`
    with pm as (
      select m.id, m.content_item_id, ${effectiveSentimentSql} as sentiment
      from mentions m
      ${effectiveSentimentJoins}
      where m.project_id = ${projectId}::uuid and m.is_relevant and m.published_at >= ${start}
        and ${side === "primary" ? ownMentionSql : sql`true`}
    ),
    effective as (
      select pm.id as mention_id, pa.id as aspect_id, pm.sentiment
      from pm
      join item_labels il on il.content_item_id = pm.content_item_id
        and il.project_id = ${projectId}::uuid and il.aspect_keys is not null
      join project_aspects pa on pa.project_id = ${projectId}::uuid
        and il.aspect_keys @> jsonb_build_array(pa.key)
      where ${entityFilter}
      union all
      select pm.id, ma.aspect_id, coalesce(ma.sentiment, pm.sentiment)
      from pm
      join mention_aspects ma on ma.mention_id = pm.id
      where ${entityFilter} and not exists (
        select 1 from item_labels il
        where il.content_item_id = pm.content_item_id
          and il.project_id = ${projectId}::uuid and il.aspect_keys is not null
      )
    )
    select pa.id, pa.name, pa.sort_order,
      count(e.mention_id)::int as mentions,
      (count(e.mention_id) filter (where e.sentiment = 'positive'))::int as positive,
      (count(e.mention_id) filter (where e.sentiment = 'neutral'))::int as neutral,
      (count(e.mention_id) filter (where e.sentiment = 'negative'))::int as negative
    from project_aspects pa
    left join effective e on e.aspect_id = pa.id
    where pa.project_id = ${projectId}::uuid
    group by pa.id
    order by pa.sort_order, pa.name
  `);
}

function dedupeQuotes(quotes: QuoteRow[]) {
  const seen = new Set<string>();
  const kept: QuoteRow[] = [];
  for (const quote of quotes) {
    const key = `${quote.author_id ?? "anon"}|${quote.day}|${quote.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(quote);
  }
  return kept;
}

function filterOutliers(quotes: QuoteRow[]) {
  if (quotes.length < 4) return quotes;
  const sorted = [...quotes].sort((a, b) => a.amount - b.amount);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return quotes;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return quotes.filter((quote) => quote.amount >= lo && quote.amount <= hi);
}

function quantile(sorted: QuoteRow[], q: number) {
  const index = (sorted.length - 1) * q;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo].amount;
  return sorted[lo].amount + (sorted[hi].amount - sorted[lo].amount) * (index - lo);
}

function amountsOf(quotes: QuoteRow[], role: QuoteRow["role"]) {
  return quotes.filter((quote) => quote.role === role).map((quote) => quote.amount);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 10) / 10;
}

function priceBuckets(amounts: number[]) {
  if (!amounts.length) return [];
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) {
    return [{ label: formatBucketEdge(min), count: amounts.length }];
  }
  const step = niceStep((max - min) / 5);
  const start = Math.floor(min / step) * step;
  const edges: number[] = [start];
  while (edges[edges.length - 1] < max) {
    edges.push(Math.round((edges[edges.length - 1] + step) * 10) / 10);
    if (edges.length > 8) break;
  }
  const buckets: { label: string; count: number }[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const from = edges[i];
    const to = edges[i + 1];
    const last = i === edges.length - 2;
    const count = amounts.filter((amount) =>
      last ? amount >= from && amount <= to : amount >= from && amount < to,
    ).length;
    const label =
      i === 0
        ? `< ${formatBucketEdge(to)}`
        : last
          ? `> ${formatBucketEdge(from)}`
          : `${formatBucketEdge(from)}–${formatBucketEdge(to)}`;
    buckets.push({ label, count });
  }
  return buckets.filter((bucket) => bucket.count > 0);
}

function formatBucketEdge(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const frac = raw / 10 ** exp;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}
