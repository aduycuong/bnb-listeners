import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  TERM_CARD_PAGE_SIZE,
  TERM_CARD_SPARKLINE_DAYS,
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
  buildTermSearchFtsFilter,
  buildTermSearchOrderClause,
} from "../utils/build-term-search-fts-sql";
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

type TermGroupRow = {
  term_id: string;
  group_id: string;
  group_name: string;
};

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

function buildGroupsByTermId(
  rows: TermGroupRow[],
): Map<string, TermCardItem["groups"]> {
  const groupsByTermId = new Map<string, TermCardItem["groups"]>();

  for (const row of rows) {
    const groups = groupsByTermId.get(row.term_id) ?? [];
    groups.push({
      id: row.group_id,
      name: row.group_name,
    });
    groupsByTermId.set(row.term_id, groups);
  }

  return groupsByTermId;
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
  const searchFilter = buildTermSearchFtsFilter(params.search);
  const orderClause = buildTermSearchOrderClause(params.search, params.sort);
  const groupFilter = params.groupId
    ? sql`AND EXISTS (
        SELECT 1
        FROM term_group_members tgm
        WHERE tgm.term_id = t.id
          AND tgm.term_group_id = ${params.groupId}::uuid
      )`
    : sql``;

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
      ${searchFilter}
      ${groupFilter}
    GROUP BY
      t.id,
      t.name,
      t.description,
      t.created_by,
      t.created_at,
      t.search_tsv
    ORDER BY ${orderClause}
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
  let termGroupRows: TermGroupRow[] = [];
  if (termIds.length > 0) {
    const [sparklineResult, termGroupsResult] = await Promise.all([
      db.execute<SparklineRow>(sql`
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
      `),
      db.execute<TermGroupRow>(sql`
        SELECT
          tgm.term_id,
          tg.id AS group_id,
          tg.name AS group_name
        FROM term_group_members tgm
        INNER JOIN term_groups tg
          ON tg.id = tgm.term_group_id
        WHERE tgm.term_id = ANY(ARRAY[${sql.join(
          termIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])
          AND tg.workspace_id = ${ctx.workspaceId}::uuid
        ORDER BY tgm.term_id, tg.name
      `),
    ]);
    sparklineRows = sparklineResult.rows;
    termGroupRows = termGroupsResult.rows;
  }

  const groupsByTermId = buildGroupsByTermId(termGroupRows);

  const items: TermCardItem[] = pageRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: toIsoTimestamp(row.created_at),
    groups: groupsByTermId.get(row.id) ?? [],
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
