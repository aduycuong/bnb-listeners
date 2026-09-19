import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { TERM_VOCABULARY_HINT_LIMIT } from "../config";
import type { TermVocabularyHint } from "../types";

/**
 * Names and descriptions of the workspace's most-used terms (by assigned
 * document count), shown to the propose step so proposals reuse existing
 * naming and the LLM can tell near-synonym terms apart by their scope.
 */
export async function loadTermVocabularyHint(
  workspaceId: string,
): Promise<TermVocabularyHint[]> {
  const result = await db.execute<{
    name: string;
    description: string | null;
  }>(sql`
    SELECT t.name, t.description
    FROM terms t
    LEFT JOIN document_terms dt ON dt.term_id = t.id
    WHERE t.workspace_id = ${workspaceId}::uuid
    GROUP BY t.id, t.name, t.description, t.created_at
    ORDER BY count(dt.document_id) DESC, t.created_at DESC
    LIMIT ${TERM_VOCABULARY_HINT_LIMIT}
  `);

  return result.rows.map((row) => ({
    name: row.name,
    description: row.description?.trim() || null,
  }));
}
