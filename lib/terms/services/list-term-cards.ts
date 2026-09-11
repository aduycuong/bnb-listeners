import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  TERM_CARD_PAGE_SIZE,
  TERM_CARD_SPARKLINE_DAYS,
  type TermCardSort,
} from "../term-card-config";
import type {
  ListTermCardsParams,
  ListTermCardsResult,
  TermCardDigest,
  TermCardItem,
  TermCardSparklinePoint,
} from "../types";
import {
  buildSparklineDateKeys,
  resolveTermCardPeriod,
} from "../utils/resolve-term-card-period";
import {
  resolveTermCardJobIds,
  resolveTermCardQuerySource,
} from "../utils/resolve-term-card-query-source";
import { toDateKey } from "../utils/to-date-key";

type TermCardRow = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: Date | string;
  doc_count: number;
  avg_quality_score: number | null;
  trend_score: number | null;
  is_stale: boolean;
};

type SparklineRow = {
  term_id: string;
  date_key: string;
  doc_count: number;
};

function getOrderClause(sort: TermCardSort) {
  switch (sort) {
    case "count":
      return sql`doc_count DESC, name ASC`;
    case "quality":
      return sql`avg_quality_score DESC NULLS LAST, name ASC`;
    case "created_at":
      return sql`t.created_at DESC, name ASC`;
    case "trend":
    default:
      return sql`trend_score DESC NULLS LAST, name ASC`;
  }
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDigest(row: TermCardRow): TermCardDigest {
  return {
    docCount: row.doc_count,
    avgQualityScore: row.avg_quality_score,
    trendScore: row.trend_score,
    isStale: row.is_stale,
  };
}

function buildSparklineSeries(
  termId: string,
  dateKeys: string[],
  rows: SparklineRow[],
): TermCardSparklinePoint[] {
  const countsByDate = new Map<string, number>();

  for (const row of rows) {
    if (row.term_id !== termId) {
      continue;
    }

    countsByDate.set(row.date_key, row.doc_count);
  }

  return dateKeys.map((dateKey) => ({
    dateKey,
    docCount: countsByDate.get(dateKey) ?? 0,
  }));
}

export async function listTermCards(
  params: ListTermCardsParams,
  ctx: WorkspaceContext,
): Promise<ListTermCardsResult> {
  const limit = params.limit ?? TERM_CARD_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const period = resolveTermCardPeriod({
    preset: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const querySource = resolveTermCardQuerySource({
    preset: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const resolvedJobIds = resolveTermCardJobIds(params.jobIds);

  // Build an optional job filter fragment. When resolvedJobIds is null the
  // query aggregates across all jobs (no WHERE on job_id).
  const jobFilter = resolvedJobIds
    ? sql`AND tdd.job_id = ANY(ARRAY[${sql.join(
        resolvedJobIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])`
    : sql``;

  const sparklineDateKeys = buildSparklineDateKeys(
    toDateKey(new Date()),
    TERM_CARD_SPARKLINE_DAYS,
  );
  const sparklineStart = sparklineDateKeys[0]!;
  const sparklineEnd = sparklineDateKeys[sparklineDateKeys.length - 1]!;

  // All period presets use the daily table; the group filter is optional.
  const result = await db.execute<TermCardRow>(sql`
    SELECT
      t.id,
      t.name,
      t.description,
      t.created_by,
      t.created_at,
      COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
      AVG(tdd.avg_quality_score) AS avg_quality_score,
      SUM(tdd.trend_score) AS trend_score,
      COALESCE(BOOL_OR(tdd.is_stale), false) AS is_stale
    FROM terms t
    LEFT JOIN term_digest_daily tdd
      ON tdd.term_id = t.id
      AND tdd.date_key >= ${querySource.startDate}::date
      AND tdd.date_key <= ${querySource.endDate}::date
      ${jobFilter}
    WHERE t.workspace_id = ${ctx.workspaceId}::uuid
    GROUP BY
      t.id,
      t.name,
      t.description,
      t.created_by,
      t.created_at
    ORDER BY ${getOrderClause(params.sort)}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `);

  const rows = result.rows;
  const pageRows = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const termIds = pageRows.map((row) => row.id);

  // Sparkline filter: same job filter applied to the 7-day sparkline.
  const sparklineJobFilter = resolvedJobIds
    ? sql`AND tdd.job_id = ANY(ARRAY[${sql.join(
        resolvedJobIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])`
    : sql``;

  let sparklineRows: SparklineRow[] = [];
  if (termIds.length > 0) {
    const sparklineResult = await db.execute<SparklineRow>(sql`
      SELECT
        tdd.term_id,
        tdd.date_key,
        tdd.doc_count
      FROM term_digest_daily tdd
      WHERE tdd.term_id = ANY(ARRAY[${sql.join(
        termIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])
        AND tdd.date_key >= ${sparklineStart}::date
        AND tdd.date_key <= ${sparklineEnd}::date
        ${sparklineJobFilter}
      ORDER BY tdd.term_id, tdd.date_key
    `);
    sparklineRows = sparklineResult.rows;
  }

  const items: TermCardItem[] = pageRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: toIsoTimestamp(row.created_at),
    digest: toDigest(row),
    sparkline: buildSparklineSeries(row.id, sparklineDateKeys, sparklineRows),
  }));

  return {
    items,
    hasMore,
    offset,
    limit,
    period,
  };
}
