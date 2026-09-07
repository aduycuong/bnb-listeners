import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export async function fetchDocumentIdsForSourceTopics(
  sourceTopicIds: string[],
): Promise<string[]> {
  if (sourceTopicIds.length === 0) {
    return [];
  }

  const result = await db.execute<{ document_id: string }>(sql`
    SELECT DISTINCT dt.document_id
    FROM document_topics dt
    WHERE dt.topic_id = ANY(ARRAY[${sql.join(
      sourceTopicIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
  `);

  return result.rows.map((row) => row.document_id);
}
