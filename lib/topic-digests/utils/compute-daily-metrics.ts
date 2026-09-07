import { and, eq, sql } from "drizzle-orm";

import { documents, documentTopics, topicDigestDaily } from "@/db/schema";
import { db } from "@/lib/db";
import { DAILY_RECENCY_WEIGHT } from "../constants";
import type { DigestMetrics } from "../types";

/**
 * Compute doc_count, avg_quality_score, and trend_score for a single
 * (topicId, dateKey, jobId) partition by aggregating the documents table.
 *
 * Only documents whose published_at falls on dateKey and whose job_id
 * matches jobId are counted.
 */
async function fetchMetrics(
  topicId: string,
  dateKey: string,
  jobId: string,
): Promise<DigestMetrics> {
  const [row] = await db
    .select({
      docCount: sql<number>`COUNT(*)::int`,
      avgQualityScore: sql<number | null>`AVG(${documents.qualityScore})`,
    })
    .from(documentTopics)
    .innerJoin(documents, eq(documentTopics.documentId, documents.id))
    .where(
      and(
        eq(documentTopics.topicId, topicId),
        sql`${documents.publishedAt}::date = ${dateKey}::date`,
        eq(documents.jobId, jobId),
      ),
    );

  const docCount = row?.docCount ?? 0;
  const avgQualityScore = row?.avgQualityScore ?? null;
  const trendScore =
    docCount > 0
      ? docCount * (avgQualityScore ?? 1.0) * DAILY_RECENCY_WEIGHT
      : null;

  return { docCount, avgQualityScore, trendScore };
}

/** True when stale_since was reset after the worker claimed this row. */
const invalidatedDuringProcessing = sql`${topicDigestDaily.staleSince} > ${topicDigestDaily.processingStartedAt}`;

export type ComputeDailyMetricsParams = {
  topicId: string;
  dateKey: string;
  jobId: string;
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
  const { topicId, dateKey, jobId, clearBulkStale } = params;
  const metrics = await fetchMetrics(topicId, dateKey, jobId);

  await db
    .update(topicDigestDaily)
    .set({
      docCount: metrics.docCount,
      avgQualityScore: metrics.avgQualityScore,
      trendScore: metrics.trendScore,
      isStale: sql`CASE WHEN ${invalidatedDuringProcessing} THEN true ELSE false END`,
      staleSince: sql`CASE WHEN ${invalidatedDuringProcessing} THEN ${topicDigestDaily.staleSince} ELSE NULL END`,
      isBulkStale: clearBulkStale
        ? sql`CASE WHEN ${invalidatedDuringProcessing} THEN ${topicDigestDaily.isBulkStale} ELSE false END`
        : undefined,
      processing: false,
      processingStartedAt: null,
      computedAt: new Date(),
    })
    .where(
      and(
        eq(topicDigestDaily.topicId, topicId),
        eq(topicDigestDaily.dateKey, dateKey),
        eq(topicDigestDaily.jobId, jobId),
        eq(topicDigestDaily.processing, true),
      ),
    );

  return metrics;
}
