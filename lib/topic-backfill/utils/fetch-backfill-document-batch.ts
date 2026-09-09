import { and, asc, eq, gt, or, sql } from "drizzle-orm";

import { documents } from "@/db/schema";
import { db } from "@/lib/db";
import type { TopicBackfillScanContext } from "../types";
import { buildBackfillScanConditions } from "./count-backfill-candidates";

export type BackfillDocumentRow = {
  id: string;
  title: string | null;
  rawContent: string;
  docType: string;
  sourceName: string;
  publishedAt: Date | null;
};

export async function fetchBackfillDocumentBatch(params: {
  context: TopicBackfillScanContext;
  limit: number;
  cursor: { publishedAt: string; documentId: string } | null;
}): Promise<BackfillDocumentRow[]> {
  const { context, limit, cursor } = params;
  const conditions = [...buildBackfillScanConditions(context)];

  if (cursor) {
    conditions.push(
      or(
        gt(documents.publishedAt, new Date(cursor.publishedAt)),
        and(
          eq(documents.publishedAt, new Date(cursor.publishedAt)),
          gt(documents.id, cursor.documentId),
        ),
      )!,
    );
  }

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      rawContent: documents.rawContent,
      docType: documents.docType,
      sourceName: documents.sourceName,
      publishedAt: documents.publishedAt,
    })
    .from(documents)
    .where(and(...conditions))
    .orderBy(asc(documents.publishedAt), asc(documents.id))
    .limit(limit);

  return rows;
}
