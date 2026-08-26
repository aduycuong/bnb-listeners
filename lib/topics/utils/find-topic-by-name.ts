import { and, eq, ne } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";

export async function findTopicByName(
  workspaceId: string,
  name: string,
  excludeId?: string,
): Promise<{ id: string; name: string } | null> {
  const conditions = [
    eq(topics.workspaceId, workspaceId),
    eq(topics.name, name),
  ];

  if (excludeId) {
    conditions.push(ne(topics.id, excludeId));
  }

  const [existing] = await db
    .select({ id: topics.id, name: topics.name })
    .from(topics)
    .where(and(...conditions))
    .limit(1);

  return existing ?? null;
}
