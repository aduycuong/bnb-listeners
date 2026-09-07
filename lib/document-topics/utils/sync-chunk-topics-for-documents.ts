import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { CHUNK_TOPIC_SYNC_BATCH_SIZE } from "../document-topic-config";

/**
 * Recompute chunks.topic_ids from document_topics for the given documents.
 * Used after bulk document_topics changes while trg_sync_chunk_topics is off.
 */
export async function syncChunkTopicsForDocuments(
  documentIds: string[],
): Promise<void> {
  if (documentIds.length === 0) {
    return;
  }

  for (let offset = 0; offset < documentIds.length; offset += CHUNK_TOPIC_SYNC_BATCH_SIZE) {
    const batch = documentIds.slice(offset, offset + CHUNK_TOPIC_SYNC_BATCH_SIZE);

    await db.execute(sql`
      UPDATE chunks c
      SET topic_ids = (
        SELECT COALESCE(array_agg(dt.topic_id), '{}')
        FROM document_topics dt
        WHERE dt.document_id = c.document_id
      )
      WHERE c.document_id = ANY(ARRAY[${sql.join(
        batch.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])
    `);
  }
}
