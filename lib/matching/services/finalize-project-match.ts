import { and, eq, ne } from "drizzle-orm";

import { mentions, projects } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * After a full match: drop mentions written under an older signature (items
 * that no longer match) and record the signature. Labeled ones stay, marked
 * as no longer produced by Match (`auto_is_relevant = null`, tier `user`).
 */
export async function finalizeProjectMatch(params: {
  projectId: string;
  signature: string;
}): Promise<{ removed: number }> {
  const removed = await db
    .delete(mentions)
    .where(
      and(
        eq(mentions.projectId, params.projectId),
        ne(mentions.matchSignature, params.signature),
        eq(mentions.userCorrected, false),
      ),
    )
    .returning({ id: mentions.id });

  await db
    .update(mentions)
    .set({
      autoIsRelevant: null,
      matchType: "manual",
      matchTier: "user",
      matchSignature: params.signature,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mentions.projectId, params.projectId),
        ne(mentions.matchSignature, params.signature),
        eq(mentions.userCorrected, true),
      ),
    );

  await db
    .update(projects)
    .set({ matchSignature: params.signature, matchedAt: new Date() })
    .where(eq(projects.id, params.projectId));

  return { removed: removed.length };
}
