import { eq, sql } from "drizzle-orm";

import { projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { projectCaseConfigSchema } from "@/lib/projects/case-templates";
import { parseProjectCase } from "@/lib/projects/project-cases";

import { METRICS_CONFIG } from "../config";
import { netSentimentScore } from "../formulas";
import type { MetricsReportParams, ProjectCaseMetricsResult } from "../types";
import { periodDateSql, periodSql, resolveReportWindow } from "../utils/resolve-report-window";

type QuoteRow = {
  mention_id: string;
  author_id: string | null;
  day: string;
  amount: number;
};

type QuestionRow = { id: string; name: string; mentions: number };

type AspectRow = {
  id: string;
  name: string;
  positive: number;
  neutral: number;
  negative: number;
};

/**
 * Numbers of the project-case page (`Chi tiết dự án`): resale prices, grouped buyer questions
 * and NSS per aspect of the tracked project (D30: a project tracks one subject, so every
 * relevant quote and question is about it). Question totals cover this period and the one
 * before. Prices and questions read L3; aspects are sums of L4. Only `case = project`.
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

  const window = await resolveReportWindow(params.projectId, params.period);
  const inPeriod = periodSql(window);
  const tz = window.timezone;
  const parsedConfig = projectCaseConfigSchema.safeParse(project.caseConfig);
  const priceRef = parsedConfig.success ? (parsedConfig.data.priceRef ?? null) : null;

  const [
    { rows: subjectRows },
    { rows: quoteRows },
    { rows: questionRows },
    { rows: questionTotalRows },
    { rows: aspectRows },
  ] = await Promise.all([
    db.execute<{ name: string }>(sql`
      select name from project_entities
      where project_id = ${params.projectId}::uuid and role = 'subject'
      limit 1
    `),
    db.execute<QuoteRow>(sql`
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
        and ${inPeriod.either}
    `),
    db.execute<QuestionRow>(sql`
      select t.id, t.name, count(*)::int as mentions
      from topics t
      join mention_topics mt on mt.topic_id = t.id and mt.kind = 'buyer_question'
      join mentions m on m.id = mt.mention_id and m.is_relevant
      where t.project_id = ${params.projectId}::uuid
        and t.kind = 'buyer_question' and t.status = 'active'
        and ${inPeriod.current}
      group by t.id
      order by mentions desc, t.name
      limit ${METRICS_CONFIG.topBuyerQuestions}
    `),
    db.execute<{ current_count: number; previous_count: number }>(sql`
      select
        count(*) filter (where ${inPeriod.current})::int as current_count,
        count(*) filter (where ${inPeriod.previous})::int as previous_count
      from mention_extractions x
      join mentions m on m.id = x.mention_id
      where m.project_id = ${params.projectId}::uuid and m.is_relevant
        and x.schema_key = 'buyer_question'
        and ${inPeriod.either}
    `),
    db.execute<AspectRow>(sql`
      select pa.id, pa.name,
        coalesce(sum(d.positive), 0)::int as positive,
        coalesce(sum(d.neutral), 0)::int as neutral,
        coalesce(sum(d.negative), 0)::int as negative
      from project_aspects pa
      left join project_aspect_daily d on d.aspect_id = pa.id and ${periodDateSql(window).current}
      where pa.project_id = ${params.projectId}::uuid
      group by pa.id
      order by pa.sort_order, pa.name
    `),
  ]);

  const currentDays = new Set(window.dates);
  const unique = dedupeQuotes(quoteRows);
  const kept = filterOutliers(unique);
  const currentKept = kept.filter((row) => currentDays.has(row.day));
  const previousKept = kept.filter((row) => !currentDays.has(row.day));

  return {
    period: window.info,
    timezone: window.timezone,
    subjectName: subjectRows[0]?.name ?? project.name,
    price: {
      daily: window.dates.map((date) => ({
        date,
        median: median(amountsOf(currentKept.filter((row) => row.day === date))),
        priceRef,
      })),
      median: {
        current: median(amountsOf(currentKept)),
        previous: median(amountsOf(previousKept)),
      },
      priceRef,
      buckets: priceBuckets(amountsOf(currentKept)),
      quotes: quoteRows.filter((row) => currentDays.has(row.day)).length,
      used: currentKept.length,
      droppedOutlier: unique.filter((row) => currentDays.has(row.day)).length - currentKept.length,
    },
    questions: {
      total: {
        current: questionTotalRows[0]?.current_count ?? 0,
        previous: questionTotalRows[0]?.previous_count ?? 0,
      },
      items: questionRows,
    },
    aspects: aspectRows.map((row) => ({ id: row.id, name: row.name, nss: netSentimentScore(row) })),
  };
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

function amountsOf(quotes: QuoteRow[]) {
  return quotes.map((quote) => quote.amount);
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
