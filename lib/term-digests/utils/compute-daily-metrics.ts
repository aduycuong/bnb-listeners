import { and, eq, sql } from "drizzle-orm";

import { termDigestDaily } from "@/db/schema";
import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { db } from "@/lib/db";
import { DAILY_RECENCY_WEIGHT } from "../constants";
import type { DigestMetrics } from "../types";

/**
 * Compute doc_count, avg_quality_score, and trend_score for a single
 * (termId, dateKey, dataSourceId) partition by aggregating the documents table.
 *
 * Only documents whose published_at falls on dateKey and whose data_source_id
 * matches dataSourceId are counted.
 *
 * A post and its companion discussion share (workspace_id, source_origin_key,
 * source_item_id) and are counted as ONE logical document. When both carry
 * the term, the post row is used; when only the discussion does, the
 * discussion row is used.
 */
async function fetchMetrics(
  termId: string,
  dateKey: string,
  dataSourceId: string,
): Promise<DigestMetrics> {
  const result = await db.execute<{
    doc_count: number;
    avg_quality_score: number | null;
  }>(sql`
    SELECT
      COUNT(*)::int AS doc_count,
      AVG(logical_docs.quality_score)::float AS avg_quality_score
    FROM (
      SELECT DISTINCT ON (d.workspace_id, d.source_origin_key, d.source_item_id)
        d.quality_score
      FROM document_terms dt
      INNER JOIN documents d ON d.id = dt.document_id
      WHERE dt.term_id = ${termId}::uuid
        AND d.published_at::date = ${dateKey}::date
        AND d.data_source_id = ${dataSourceId}::uuid
      ORDER BY
        d.workspace_id,
        d.source_origin_key,
        d.source_item_id,
        (d.doc_type = ${DISCUSSION_DOC_TYPE}) ASC
    ) AS logical_docs
  `);

  const row = result.rows[0];
  const docCount = row?.doc_count ?? 0;
  const avgQualityScore = row?.avg_quality_score ?? null;
  const trendScore =
    docCount > 0
      ? docCount * (avgQualityScore ?? 1.0) * DAILY_RECENCY_WEIGHT
      : null;

  return { docCount, avgQualityScore, trendScore };
}

/** True when stale_since was reset after the worker claimed this row. */
const invalidatedDuringProcessing = sql`${termDigestDaily.staleSince} > ${termDigestDaily.processingStartedAt}`;

export type ComputeDailyMetricsParams = {
  termId: string;
  dateKey: string;
  dataSourceId: string;
  /** When true, also resets is_bulk_stale so bulk drain doesn't re-claim the row. */
  clearBulkStale: boolean;
};

/**
 * Compute metrics for one daily row and write them back.
 *
 * Always writes fresh metrics and clears processing. Clears is_stale (and
 * stale_since) only when stale_since <= processing_started_at (no invalidate
 * during processing). When stale_since > processing_started_at, keeps is_stale
 * and stale_since so the row re-queues at the back.
 */
export async function computeDailyMetrics(
  params: ComputeDailyMetricsParams,
): Promise<DigestMetrics> {
  const { termId, dateKey, dataSourceId, clearBulkStale } = params;
  const metrics = await fetchMetrics(termId, dateKey, dataSourceId);

  await db
    .update(termDigestDaily)
    .set({
      docCount: metrics.docCount,
      avgQualityScore: metrics.avgQualityScore,
      trendScore: metrics.trendScore,
      isStale: sql`CASE WHEN ${invalidatedDuringProcessing} THEN true ELSE false END`,
      staleSince: sql`CASE WHEN ${invalidatedDuringProcessing} THEN ${termDigestDaily.staleSince} ELSE NULL END`,
      isBulkStale: clearBulkStale
        ? sql`CASE WHEN ${invalidatedDuringProcessing} THEN ${termDigestDaily.isBulkStale} ELSE false END`
        : undefined,
      processing: false,
      processingStartedAt: null,
      computedAt: new Date(),
    })
    .where(
      and(
        eq(termDigestDaily.termId, termId),
        eq(termDigestDaily.dateKey, dateKey),
        eq(termDigestDaily.dataSourceId, dataSourceId),
        eq(termDigestDaily.processing, true),
      ),
    );

  return metrics;
}
