import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

/**
 * Ensures the parent topic exists in the workspace and would not create a cycle.
 */
export async function assertValidParent(
  workspaceId: string,
  parentId: string,
  topicId?: string,
): Promise<void> {
  if (topicId && parentId === topicId) {
    throw new UnknownServiceError("A topic cannot be its own parent.");
  }

  const [parent] = await db
    .select({ id: topics.id, parentId: topics.parentId })
    .from(topics)
    .where(and(eq(topics.id, parentId), eq(topics.workspaceId, workspaceId)))
    .limit(1);

  if (!parent) {
    throw new NotFoundError("topic", parentId);
  }

  if (!topicId) {
    return;
  }

  let currentParentId: string | null = parent.parentId;
  const seen = new Set<string>([parentId]);

  while (currentParentId) {
    if (currentParentId === topicId) {
      throw new UnknownServiceError(
        "A topic cannot be nested under one of its descendants.",
      );
    }

    if (seen.has(currentParentId)) {
      break;
    }

    seen.add(currentParentId);

    const [row] = await db
      .select({ parentId: topics.parentId })
      .from(topics)
      .where(
        and(
          eq(topics.id, currentParentId),
          eq(topics.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    currentParentId = row?.parentId ?? null;
  }
}
