import { inArray, sql } from "drizzle-orm";

import { dimDates } from "@/db/schema";
import { db } from "@/lib/db";
import {
  GRAIN_DIM_COLUMN,
  GRAIN_PERIOD_INTERVAL,
  ROLLUP_GRAINS,
  ROLLUP_RECENCY_WEIGHTS,
  type RollupGrain,
} from "../constants";
import type { AffectedPeriod } from "../types";

// ---------------------------------------------------------------------------
// Step 1 — derive affected periods from computed date_keys
// ---------------------------------------------------------------------------

/**
 * Look up dim_dates for all computed date_keys and collect the unique
 * (grain, period_start) pairs that must be rebuilt.
 */
export async function deriveAffectedPeriods(
  dateKeys: string[],
): Promise<AffectedPeriod[]> {
  if (dateKeys.length === 0) return [];

  const dimRows = await db
    .select({
      weekStart: dimDates.weekStart,
      monthStart: dimDates.monthStart,
      quarterStart: dimDates.quarterStart,
      yearStart: dimDates.yearStart,
    })
    .from(dimDates)
    .where(inArray(dimDates.dateKey, dateKeys));

  // Collect unique period starts per grain using a Set for dedup.
  const seen = new Map<RollupGrain, Set<string>>();
  for (const grain of ROLLUP_GRAINS) {
    seen.set(grain, new Set());
  }

  for (const row of dimRows) {
    seen.get("week")!.add(row.weekStart);
    seen.get("month")!.add(row.monthStart);
    seen.get("quarter")!.add(row.quarterStart);
    seen.get("year")!.add(row.yearStart);
  }

  const periods: AffectedPeriod[] = [];
  for (const grain of ROLLUP_GRAINS) {
    for (const periodStart of seen.get(grain)!) {
      periods.push({ grain, periodStart });
    }
  }
  return periods;
}

// ---------------------------------------------------------------------------
// Step 2 — upsert rollup rows and re-rank within workspace
// ---------------------------------------------------------------------------

/**
 * Rebuild one (grain, period_start) rollup row:
 * 1. Aggregate topic_digest_daily for the period (only non-stale rows).
 * 2. Upsert into topic_digest_rollup.
 * 3. Re-rank trend_rank PARTITION BY workspace_id.
 */
async function rebuildOnePeriod(
  grain: RollupGrain,
  periodStart: string,
): Promise<void> {
  const recencyWeight = ROLLUP_RECENCY_WEIGHTS[grain];
  const dimColumn = GRAIN_DIM_COLUMN[grain];
  const periodInterval = GRAIN_PERIOD_INTERVAL[grain];

  // Upsert aggregated rollup row for the period.
  await db.execute(sql`
    INSERT INTO topic_digest_rollup
      (topic_id, period_grain, period_start, period_end,
       doc_count, avg_quality_score, trend_score, computed_at)
    SELECT
      tdd.topic_id,
      ${grain},
      ${periodStart}::date,
      (${periodStart}::date + ${periodInterval}::interval)::date,
      SUM(tdd.doc_count),
      CASE
        WHEN COUNT(*) FILTER (WHERE tdd.avg_quality_score IS NOT NULL) > 0
        THEN AVG(tdd.avg_quality_score) FILTER (WHERE tdd.avg_quality_score IS NOT NULL)
        ELSE NULL
      END,
      SUM(tdd.doc_count)
        * COALESCE(
            CASE
              WHEN COUNT(*) FILTER (WHERE tdd.avg_quality_score IS NOT NULL) > 0
              THEN AVG(tdd.avg_quality_score) FILTER (WHERE tdd.avg_quality_score IS NOT NULL)
              ELSE NULL
            END,
            1.0
          )
        * ${recencyWeight},
      now()
    FROM topic_digest_daily tdd
    JOIN dim_dates d ON d.date_key = tdd.date_key
    WHERE d.${sql.raw(dimColumn)} = ${periodStart}::date
      AND tdd.is_stale = false
    GROUP BY tdd.topic_id
    ON CONFLICT (topic_id, period_grain, period_start) DO UPDATE SET
      period_end        = EXCLUDED.period_end,
      doc_count         = EXCLUDED.doc_count,
      avg_quality_score = EXCLUDED.avg_quality_score,
      trend_score       = EXCLUDED.trend_score,
      computed_at       = EXCLUDED.computed_at
  `);

  // Re-rank within workspace for this grain + period.
  await db.execute(sql`
    UPDATE topic_digest_rollup tdr
    SET trend_rank = ranked.new_rank
    FROM (
      SELECT
        tdr2.topic_id,
        RANK() OVER (
          PARTITION BY t.workspace_id
          ORDER BY tdr2.trend_score DESC NULLS LAST
        ) AS new_rank
      FROM topic_digest_rollup tdr2
      JOIN topics t ON t.id = tdr2.topic_id
      WHERE tdr2.period_grain = ${grain}
        AND tdr2.period_start = ${periodStart}::date
    ) ranked
    WHERE tdr.topic_id    = ranked.topic_id
      AND tdr.period_grain = ${grain}
      AND tdr.period_start = ${periodStart}::date
  `);
}

/**
 * Rebuild all rollup periods affected by the given set of computed date_keys.
 * Processes each (grain, period_start) pair independently.
 */
export async function rebuildRollupPeriods(dateKeys: string[]): Promise<void> {
  const periods = await deriveAffectedPeriods(dateKeys);
  for (const { grain, periodStart } of periods) {
    await rebuildOnePeriod(grain, periodStart);
  }
}
