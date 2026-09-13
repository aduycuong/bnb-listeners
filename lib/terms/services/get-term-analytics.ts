import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  GetTermAnalyticsParams,
  GetTermAnalyticsResult,
  TermAnalyticsDailyPoint,
  TermAnalyticsItem,
  TermAnalyticsSummary,
} from "../types";
import { addUtcDays, parseDateKey, toDateKey } from "../utils/to-date-key";

type TermRow = {
  id: string;
  name: string;
};

type DailyRow = {
  term_id: string;
  date_key: string;
  doc_count: number;
  avg_quality_score: number | null;
  trend_score: number | null;
};

type SummaryRow = {
  term_id: string;
  doc_count: number;
  avg_quality_score: number | null;
  trend_score: number | null;
  is_stale: boolean;
};

function buildDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  let cursor = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  while (cursor.getTime() <= end.getTime()) {
    keys.push(toDateKey(cursor));
    cursor = addUtcDays(cursor, 1);
  }

  return keys;
}

function toSummary(row: SummaryRow): TermAnalyticsSummary {
  return {
    docCount: row.doc_count,
    avgQualityScore: row.avg_quality_score,
    trendScore: row.trend_score,
    isStale: row.is_stale,
  };
}

function buildDailySeries(
  dateKeys: string[],
  rows: DailyRow[],
): TermAnalyticsDailyPoint[] {
  const valuesByDate = new Map(rows.map((row) => [row.date_key, row]));

  return dateKeys.map((dateKey) => {
    const row = valuesByDate.get(dateKey);

    return {
      dateKey,
      docCount: row?.doc_count ?? 0,
      avgQualityScore: row?.avg_quality_score ?? null,
      trendScore: row?.trend_score ?? null,
    };
  });
}

function buildTermAnalyticsItem(
  term: TermRow,
  dateKeys: string[],
  dailyRows: DailyRow[],
  summaryRow: SummaryRow | undefined,
): TermAnalyticsItem {
  const termDailyRows = dailyRows.filter((row) => row.term_id === term.id);

  return {
    id: term.id,
    name: term.name,
    summary: summaryRow
      ? toSummary(summaryRow)
      : {
          docCount: 0,
          avgQualityScore: null,
          trendScore: null,
          isStale: false,
        },
    daily: buildDailySeries(dateKeys, termDailyRows),
  };
}

export async function getTermAnalytics(
  params: GetTermAnalyticsParams,
  ctx: WorkspaceContext,
): Promise<GetTermAnalyticsResult> {
  const { period, termIds } = params;
  const uniqueTermIds = [...new Set(termIds)];

  if (uniqueTermIds.length === 0) {
    return { period, terms: [], notFound: [] };
  }

  const dateKeys = buildDateKeys(period.startDate, period.endDate);
  const termIdList = sql.join(
    uniqueTermIds.map((termId) => sql`${termId}::uuid`),
    sql`, `,
  );

  const [termResult, dailyResult, summaryResult] = await Promise.all([
    db.execute<TermRow>(sql`
      SELECT id, name
      FROM terms
      WHERE workspace_id = ${ctx.workspaceId}::uuid
        AND id IN (${termIdList})
      ORDER BY name ASC
    `),
    db.execute<DailyRow>(sql`
      SELECT
        tdd.term_id,
        tdd.date_key::text AS date_key,
        COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
        AVG(tdd.avg_quality_score) AS avg_quality_score,
        SUM(tdd.trend_score) AS trend_score
      FROM term_digest_daily tdd
      WHERE tdd.term_id IN (${termIdList})
        AND tdd.date_key >= ${period.startDate}::date
        AND tdd.date_key <= ${period.endDate}::date
      GROUP BY tdd.term_id, tdd.date_key
      ORDER BY tdd.term_id, tdd.date_key
    `),
    db.execute<SummaryRow>(sql`
      SELECT
        tdd.term_id,
        COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
        AVG(tdd.avg_quality_score) AS avg_quality_score,
        SUM(tdd.trend_score) AS trend_score,
        COALESCE(BOOL_OR(tdd.is_stale), false) AS is_stale
      FROM term_digest_daily tdd
      WHERE tdd.term_id IN (${termIdList})
        AND tdd.date_key >= ${period.startDate}::date
        AND tdd.date_key <= ${period.endDate}::date
      GROUP BY tdd.term_id
    `),
  ]);

  const foundTermIds = new Set(termResult.rows.map((row) => row.id));
  const notFound = uniqueTermIds.filter((termId) => !foundTermIds.has(termId));
  const summaryByTermId = new Map(
    summaryResult.rows.map((row) => [row.term_id, row]),
  );

  const terms = termResult.rows.map((term) =>
    buildTermAnalyticsItem(
      term,
      dateKeys,
      dailyResult.rows,
      summaryByTermId.get(term.id),
    ),
  );

  return { period, terms, notFound };
}
