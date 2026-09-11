import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export async function fetchDocumentIdsForSourceTerms(
  sourceTermIds: string[],
): Promise<string[]> {
  if (sourceTermIds.length === 0) {
    return [];
  }

  const result = await db.execute<{ document_id: string }>(sql`
    SELECT DISTINCT dt.document_id
    FROM document_terms dt
    WHERE dt.term_id = ANY(ARRAY[${sql.join(
      sourceTermIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}])
  `);

  return result.rows.map((row) => row.document_id);
}
