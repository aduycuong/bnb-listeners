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
import type { AffectedDigestPartition } from "../types";

type RollupRebuildTarget = {
  grain: RollupGrain;
  periodStart: string;
  groupId: string;
};

function dedupeRebuildTargets(
  targets: RollupRebuildTarget[],
): RollupRebuildTarget[] {
  const seen = new Set<string>();
  const result: RollupRebuildTarget[] = [];

  for (const target of targets) {
    const key = `${target.grain}:${target.periodStart}:${target.groupId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(target);
  }

  return result;
}

/**
 * Derive unique (grain, period_start, group_id) triples from affected daily
 * partitions.
 */
export async function deriveAffectedRollupTargets(
  affected: AffectedDigestPartition[],
): Promise<RollupRebuildTarget[]> {
  if (affected.length === 0) return [];

  const dateKeys = [...new Set(affected.map((row) => row.dateKey))];

  const dimRows = await db
    .select({
      dateKey: dimDates.dateKey,
      weekStart: dimDates.weekStart,
      monthStart: dimDates.monthStart,
      quarterStart: dimDates.quarterStart,
      yearStart: dimDates.yearStart,
    })
    .from(dimDates)
    .where(inArray(dimDates.dateKey, dateKeys));

  const dimByDateKey = new Map(dimRows.map((row) => [row.dateKey, row]));
  const targets: RollupRebuildTarget[] = [];

  for (const { dateKey, groupId } of affected) {
    const dim = dimByDateKey.get(dateKey);
    if (!dim) {
      continue;
    }

    for (const grain of ROLLUP_GRAINS) {
      const periodStart =
        grain === "week"
          ? dim.weekStart
          : grain === "month"
            ? dim.monthStart
            : grain === "quarter"
              ? dim.quarterStart
              : dim.yearStart;

      targets.push({ grain, periodStart, groupId });
    }
  }

  return dedupeRebuildTargets(targets);
}

/**
 * Rebuild one (grain, period_start, group_id) rollup row:
 * 1. Aggregate topic_digest_daily for the period (only non-stale rows).
 * 2. Upsert into topic_digest_rollup.
 * 3. Re-rank trend_rank PARTITION BY (workspace_id, group_id).
 */
async function rebuildOnePeriod(
  grain: RollupGrain,
  periodStart: string,
  groupId: string,
): Promise<void> {
  const recencyWeight = ROLLUP_RECENCY_WEIGHTS[grain];
  const dimColumn = GRAIN_DIM_COLUMN[grain];
  const periodInterval = GRAIN_PERIOD_INTERVAL[grain];

  await db.execute(sql`
    INSERT INTO topic_digest_rollup
      (topic_id, period_grain, period_start, period_end, group_id,
       doc_count, avg_quality_score, trend_score, computed_at)
    SELECT
      tdd.topic_id,
      ${grain},
      ${periodStart}::date,
      (${periodStart}::date + ${periodInterval}::interval)::date,
      ${groupId}::uuid,
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
      AND tdd.group_id = ${groupId}::uuid
      AND tdd.is_stale = false
    GROUP BY tdd.topic_id
    ON CONFLICT (topic_id, period_grain, period_start, group_id) DO UPDATE SET
      period_end        = EXCLUDED.period_end,
      doc_count         = EXCLUDED.doc_count,
      avg_quality_score = EXCLUDED.avg_quality_score,
      trend_score       = EXCLUDED.trend_score,
      computed_at       = EXCLUDED.computed_at
  `);

  await db.execute(sql`
    UPDATE topic_digest_rollup tdr
    SET trend_rank = ranked.new_rank
    FROM (
      SELECT
        tdr2.topic_id,
        RANK() OVER (
          PARTITION BY t.workspace_id, tdr2.group_id
          ORDER BY tdr2.trend_score DESC NULLS LAST
        ) AS new_rank
      FROM topic_digest_rollup tdr2
      JOIN topics t ON t.id = tdr2.topic_id
      WHERE tdr2.period_grain = ${grain}
        AND tdr2.period_start = ${periodStart}::date
        AND tdr2.group_id = ${groupId}::uuid
    ) ranked
    WHERE tdr.topic_id     = ranked.topic_id
      AND tdr.period_grain = ${grain}
      AND tdr.period_start = ${periodStart}::date
      AND tdr.group_id     = ${groupId}::uuid
  `);
}

/**
 * Rebuild all rollup periods affected by the given daily partitions.
 */
export async function rebuildRollupPeriods(
  affected: AffectedDigestPartition[],
): Promise<void> {
  const targets = await deriveAffectedRollupTargets(affected);
  for (const { grain, periodStart, groupId } of targets) {
    await rebuildOnePeriod(grain, periodStart, groupId);
  }
}
