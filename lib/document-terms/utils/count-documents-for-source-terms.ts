import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export async function countDocumentsForSourceTerms(
  sourceTermIds: string[],
): Promise<number> {
  if (sourceTermIds.length === 0) {
    return 0;
  }

  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT dt.document_id)::int AS count
    FROM document_terms dt
    WHERE dt.term_id = ANY(ARRAY[${sql.join(
      sourceTermIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
  `);

  return result.rows[0]?.count ?? 0;
}
