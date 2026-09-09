import { and, eq, gte } from "drizzle-orm";

import { documentTopics } from "@/db/schema";
import { DOCUMENT_TOPIC_ASSIGNED_BY } from "@/lib/document-topics/document-topic-config";
import { db } from "@/lib/db";

export async function fetchBackfillAssignedDocumentIds(params: {
  topicId: string;
  startedAt: Date;
}): Promise<string[]> {
  const rows = await db
    .select({ documentId: documentTopics.documentId })
    .from(documentTopics)
    .where(
      and(
        eq(documentTopics.topicId, params.topicId),
        eq(documentTopics.assignedBy, DOCUMENT_TOPIC_ASSIGNED_BY.topicBackfill),
        gte(documentTopics.assignedAt, params.startedAt),
      ),
    );

  return rows.map((row) => row.documentId);
}
