import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { TERM_VOCABULARY_HINT_LIMIT } from "../config";

/**
 * Names of the workspace's most-used terms (by assigned document count),
 * shown to the propose step so proposals reuse existing naming.
 */
export async function loadTermVocabularyHint(
  workspaceId: string,
): Promise<string[]> {
  const result = await db.execute<{ name: string }>(sql`
    SELECT t.name
    FROM terms t
    LEFT JOIN document_terms dt ON dt.term_id = t.id
    WHERE t.workspace_id = ${workspaceId}::uuid
    GROUP BY t.id, t.name, t.created_at
    ORDER BY count(dt.document_id) DESC, t.created_at DESC
    LIMIT ${TERM_VOCABULARY_HINT_LIMIT}
  `);

  return result.rows.map((row) => row.name);
}
