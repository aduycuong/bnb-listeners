import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateTopicParams, UpdateTopicResult } from "../types";
import { assertUniqueTopicName } from "../utils/assert-unique-topic-name";
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

  const [topic] = await db
    .update(topics)
    .set(updates)
    .where(and(eq(topics.id, id), eq(topics.workspaceId, ctx.workspaceId)))
    .returning();

  if (!topic) {
    throw new NotFoundError("topic", id);
  }

  return toTopicListItem(topic);
}
