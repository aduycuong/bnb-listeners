import { eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";

import type { ClassifierTopic } from "../types";

/**
 * Loads all topics for classifier matching (including LLM-created, unverified ones).
 */
export async function loadTopicsForClassifier(
  workspaceId: string,
): Promise<ClassifierTopic[]> {
  const rows = await db
    .select({
      id: topics.id,
      slug: topics.slug,
      name: topics.name,
      description: topics.description,
      parentId: topics.parentId,
    })
    .from(topics)
    .where(eq(topics.workspaceId, workspaceId));

  const nameById = new Map(rows.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentName: row.parentId ? (nameById.get(row.parentId) ?? null) : null,
  }));
}
