import { and, eq, gte, isNotNull, lt, notExists, sql } from "drizzle-orm";

import { documentTopics, documents } from "@/db/schema";
import { db } from "@/lib/db";

import type { TopicBackfillScanContext } from "../types";

export async function countBackfillCandidates(
  context: TopicBackfillScanContext,
): Promise<{ count: number; avgContentLength: number }> {
  const scanConditions = buildBackfillScanConditions(context);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(and(...scanConditions));

  const [avgRow] = await db
    .select({
      avgLength: sql<number>`coalesce(avg(length(${documents.rawContent})), 0)::float`,
    })
    .from(documents)
    .where(and(...scanConditions));

  return {
    count: countRow?.count ?? 0,
    avgContentLength: avgRow?.avgLength ?? 0,
  };
}

export function buildBackfillScanConditions(context: TopicBackfillScanContext) {
  const conditions = [
    eq(documents.workspaceId, context.workspaceId),
    isNotNull(documents.publishedAt),
    gte(documents.publishedAt, context.newListeningStartedAt),
    lt(documents.publishedAt, context.scanEndAt),
    sql`${documents.qualityScore} >= ${context.qualityMin}`,
  ];

  if (!context.includeAlreadyAssigned) {
    conditions.push(
      notExists(
        db
          .select({ one: sql`1` })
          .from(documentTopics)
          .where(
            and(
              eq(documentTopics.documentId, documents.id),
              eq(documentTopics.topicId, context.topicId),
            ),
          ),
      ),
    );
  }

  return conditions;
}
