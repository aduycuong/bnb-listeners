import { eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";

import type { ClassifierTerm } from "../types";

/**
 * Loads all terms for classifier matching (including LLM-created terms).
 */
export async function loadTermsForClassifier(
  workspaceId: string,
): Promise<ClassifierTerm[]> {
  const rows = await db
    .select({
      id: terms.id,
      name: terms.name,
      description: terms.description,
    })
    .from(terms)
    .where(eq(terms.workspaceId, workspaceId));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
  }));
}
