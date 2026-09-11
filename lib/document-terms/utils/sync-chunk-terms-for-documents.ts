import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { CHUNK_TERM_SYNC_BATCH_SIZE } from "../document-term-config";

/**
 * Recompute chunks.term_ids from document_terms for the given documents.
 * Used after bulk document_terms changes while trg_sync_chunk_terms is off.
 */
export async function syncChunkTermsForDocuments(
  documentIds: string[],
): Promise<void> {
  if (documentIds.length === 0) {
    return;
  }

  for (let offset = 0; offset < documentIds.length; offset += CHUNK_TERM_SYNC_BATCH_SIZE) {
    const batch = documentIds.slice(offset, offset + CHUNK_TERM_SYNC_BATCH_SIZE);

    await db.execute(sql`
      UPDATE chunks c
      SET term_ids = (
        SELECT COALESCE(array_agg(dt.term_id), '{}')
        FROM document_terms dt
        WHERE dt.document_id = c.document_id
      )
      WHERE c.document_id = ANY(ARRAY[${sql.join(
        batch.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])
    `);
  }
}
