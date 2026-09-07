import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export async function countDocumentsForSourceTopics(
  sourceTopicIds: string[],
): Promise<number> {
  if (sourceTopicIds.length === 0) {
    return 0;
  }

  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT dt.document_id)::int AS count
    FROM document_topics dt
    WHERE dt.topic_id = ANY(ARRAY[${sql.join(
      sourceTopicIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
  `);

  return result.rows[0]?.count ?? 0;
}
