import { and, eq, sql } from "drizzle-orm";

import { documents, documentTopics, topicDigestDaily } from "@/db/schema";
import { db } from "@/lib/db";
import { DAILY_RECENCY_WEIGHT } from "../constants";
import type { DigestMetrics } from "../types";

/**
 * Compute doc_count, avg_quality_score, and trend_score for a single
 * (topicId, dateKey) pair by aggregating the documents table.
 *
 * Only documents whose published_at falls on dateKey are counted.
 */
async function fetchMetrics(
  topicId: string,
  dateKey: string,
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

export type ComputeDailyMetricsParams = {
  topicId: string;
  dateKey: string;
  /** When true, also resets is_bulk_stale so bulk drain doesn't re-claim the row. */
  clearBulkStale: boolean;
};

/**
 * Compute metrics for one daily row and write them back.
 * Marks the row is_stale = false, processing = false after writing.
 */
export async function computeDailyMetrics(
  params: ComputeDailyMetricsParams,
): Promise<DigestMetrics> {
  const { topicId, dateKey, clearBulkStale } = params;
  const metrics = await fetchMetrics(topicId, dateKey);

  await db
    .update(topicDigestDaily)
    .set({
      docCount: metrics.docCount,
      avgQualityScore: metrics.avgQualityScore,
      trendScore: metrics.trendScore,
      isStale: false,
      isBulkStale: clearBulkStale ? false : undefined,
      processing: false,
      processingStartedAt: null,
      computedAt: new Date(),
    })
    .where(
      and(
        eq(topicDigestDaily.topicId, topicId),
        eq(topicDigestDaily.dateKey, dateKey),
      ),
    );

  return metrics;
}
