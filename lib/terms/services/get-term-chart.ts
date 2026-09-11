import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/common/service-errors";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  GetTermChartParams,
  GetTermChartResult,
  TermDetailChartDigest,
  TermDetailChartPoint,
} from "../types";
import type { TermDetailChartMetric } from "../term-detail-chart-config";
import {
  resolveTermDetailChartBucket,
  resolveTermDetailChartPeriod,
  type TermDetailChartBucket,
} from "../utils/resolve-term-detail-chart-period";
import { addUtcDays, parseDateKey, toDateKey } from "../utils/to-date-key";

type DigestRow = {
  doc_count: number;
  avg_quality_score: number | null;
  trend_score: number | null;
  is_stale: boolean;
};

type ChartRow = {
  bucket_key: string;
  value: number | null;
};

function formatDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parseDateKey(dateKey));
}

function formatMonthLabel(monthStart: string): string {
  const date = parseDateKey(monthStart);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildDayBucketKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor.getTime() <= end.getTime()) {
    keys.push(toDateKey(cursor));
    cursor = addUtcDays(cursor, 1);
  }

  return keys;
}

function buildMonthBucketKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor.getTime() <= end.getTime()) {
    keys.push(toDateKey(cursor));
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }

  return keys;
}

function getMetricSelect(metric: TermDetailChartMetric) {
  switch (metric) {
    case "doc_count":
      return sql`COALESCE(SUM(tdd.doc_count), 0)::float`;
    case "avg_quality_score":
      return sql`AVG(tdd.avg_quality_score)`;
    case "trend_score":
      return sql`SUM(tdd.trend_score)`;
    default: {
      const exhaustive: never = metric;
      throw new Error(`Unsupported chart metric: ${exhaustive}`);
    }
  }
}

function toDigest(row: DigestRow): TermDetailChartDigest {
  return {
    docCount: row.doc_count,
    avgQualityScore: row.avg_quality_score,
    trendScore: row.trend_score,
    isStale: row.is_stale,
  };
}

function buildChartSeries(
  bucketKeys: string[],
  bucket: TermDetailChartBucket,
  rows: ChartRow[],
): TermDetailChartPoint[] {
  const valuesByKey = new Map(rows.map((row) => [row.bucket_key, row.value]));

  return bucketKeys.map((bucketKey) => ({
    bucketKey,
    label:
      bucket === "month"
        ? formatMonthLabel(bucketKey)
        : formatDayLabel(bucketKey),
    value: valuesByKey.get(bucketKey) ?? 0,
  }));
}

async function assertTermInWorkspace(termId: string, workspaceId: string) {
  const result = await db.execute<{ id: string }>(sql`
    SELECT id
    FROM terms
    WHERE id = ${termId}::uuid
      AND workspace_id = ${workspaceId}::uuid
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    throw new NotFoundError("term", termId);
  }
}

export async function getTermChart(
  params: GetTermChartParams,
  ctx: WorkspaceContext,
): Promise<GetTermChartResult> {
  await assertTermInWorkspace(params.id, ctx.workspaceId);

  const period = resolveTermDetailChartPeriod({
    preset: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const chartBucket = resolveTermDetailChartBucket(
    params.period,
    period.startDate,
    period.endDate,
  );
  const metricSelect = getMetricSelect(params.metric);

  const digestResult = await db.execute<DigestRow>(sql`
    SELECT
      COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
      AVG(tdd.avg_quality_score) AS avg_quality_score,
      SUM(tdd.trend_score) AS trend_score,
      COALESCE(BOOL_OR(tdd.is_stale), false) AS is_stale
    FROM term_digest_daily tdd
    WHERE tdd.term_id = ${params.id}::uuid
      AND tdd.date_key >= ${period.startDate}::date
      AND tdd.date_key <= ${period.endDate}::date
  `);

  const digestRow = digestResult.rows[0] ?? {
    doc_count: 0,
    avg_quality_score: null,
    trend_score: null,
    is_stale: false,
  };

  let chartResult: ChartRow[] = [];

  if (chartBucket === "month") {
    const result = await db.execute<ChartRow>(sql`
      SELECT
        dd.month_start::text AS bucket_key,
        ${metricSelect} AS value
      FROM term_digest_daily tdd
      INNER JOIN dim_dates dd ON dd.date_key = tdd.date_key
      WHERE tdd.term_id = ${params.id}::uuid
        AND tdd.date_key >= ${period.startDate}::date
        AND tdd.date_key <= ${period.endDate}::date
      GROUP BY dd.month_start
      ORDER BY dd.month_start
    `);
    chartResult = result.rows;
  } else {
    const result = await db.execute<ChartRow>(sql`
      SELECT
        tdd.date_key::text AS bucket_key,
        ${metricSelect} AS value
      FROM term_digest_daily tdd
      WHERE tdd.term_id = ${params.id}::uuid
        AND tdd.date_key >= ${period.startDate}::date
        AND tdd.date_key <= ${period.endDate}::date
      GROUP BY tdd.date_key
      ORDER BY tdd.date_key
    `);
    chartResult = result.rows;
  }

  const bucketKeys =
    chartBucket === "month"
      ? buildMonthBucketKeys(period.startDate, period.endDate)
      : buildDayBucketKeys(period.startDate, period.endDate);

  return {
    points: buildChartSeries(bucketKeys, chartBucket, chartResult),
    bucket: chartBucket,
    metric: params.metric,
    digest: toDigest(digestRow),
    period: {
      preset: period.preset,
      startDate: period.startDate,
      endDate: period.endDate,
    },
  };
}
