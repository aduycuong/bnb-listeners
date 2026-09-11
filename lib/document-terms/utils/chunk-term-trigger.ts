import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { TRG_SYNC_CHUNK_TERMS } from "../document-term-config";

export async function disableChunkTermTrigger(): Promise<void> {
  await db.execute(
    sql.raw(
      `ALTER TABLE document_terms DISABLE TRIGGER ${TRG_SYNC_CHUNK_TERMS}`,
    ),
  );
}

export async function enableChunkTermTrigger(): Promise<void> {
  await db.execute(
    sql.raw(`ALTER TABLE document_terms ENABLE TRIGGER ${TRG_SYNC_CHUNK_TERMS}`),
  );
}
