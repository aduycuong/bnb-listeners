import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { TRG_SYNC_CHUNK_TOPICS } from "../document-topic-config";

export async function disableChunkTopicTrigger(): Promise<void> {
  await db.execute(
    sql.raw(
      `ALTER TABLE document_topics DISABLE TRIGGER ${TRG_SYNC_CHUNK_TOPICS}`,
    ),
  );
}

export async function enableChunkTopicTrigger(): Promise<void> {
  await db.execute(
    sql.raw(`ALTER TABLE document_topics ENABLE TRIGGER ${TRG_SYNC_CHUNK_TOPICS}`),
  );
}
