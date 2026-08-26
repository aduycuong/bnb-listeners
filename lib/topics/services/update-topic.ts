import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateTopicParams, UpdateTopicResult } from "../types";
import { assertUniqueTopicName } from "../utils/assert-unique-topic-name";
import { assertValidParent } from "../utils/assert-valid-parent";
import { normalizeTopicDescription } from "../utils/normalize-topic-description";
import { toTopicListItem } from "../utils/to-topic-list-item";

export async function updateTopic(
  params: UpdateTopicParams,
  ctx: WorkspaceContext,
): Promise<UpdateTopicResult> {
  const { id, ...rest } = params;

  const [existing] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, id), eq(topics.workspaceId, ctx.workspaceId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("topic", id);
  }

  const updates: Partial<typeof topics.$inferInsert> = {};

  if (rest.name !== undefined) {
    const name = rest.name.trim();
    await assertUniqueTopicName(ctx.workspaceId, name, id);
    updates.name = name;
  }

  if (rest.description !== undefined) {
    updates.description = normalizeTopicDescription(rest.description) ?? null;
  }

  if (rest.parentId !== undefined) {
    if (rest.parentId) {
      await assertValidParent(ctx.workspaceId, rest.parentId, id);
    }
    updates.parentId = rest.parentId;
  }

  if (rest.verified !== undefined) {
    updates.verified = rest.verified;
  }

  const [topic] = await db
    .update(topics)
    .set(updates)
    .where(and(eq(topics.id, id), eq(topics.workspaceId, ctx.workspaceId)))
    .returning();

  if (!topic) {
    throw new NotFoundError("topic", id);
  }

  let parentName: string | null = null;
  if (topic.parentId) {
    const [parent] = await db
      .select({ name: topics.name })
      .from(topics)
      .where(
        and(
          eq(topics.id, topic.parentId),
          eq(topics.workspaceId, ctx.workspaceId),
        ),
      )
      .limit(1);
    parentName = parent?.name ?? null;
  }

  return toTopicListItem(topic, parentName);
}
