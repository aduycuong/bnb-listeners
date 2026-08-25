import { eq, and } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Returns a slug that does not collide with an existing topic.
 * Appends `-2`, `-3`, … when the base slug is taken.
 */
export async function ensureUniqueTopicSlug(
  workspaceId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.workspaceId, workspaceId), eq(topics.slug, slug)))
      .limit(1);

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
