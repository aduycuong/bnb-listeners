import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TOPIC_CREATED_BY } from "../topic-config";
import type { CreateTopicParams, CreateTopicResult } from "../types";
import { assertUniqueTopicName } from "../utils/assert-unique-topic-name";
import { assertValidParent } from "../utils/assert-valid-parent";
import { normalizeTopicDescription } from "../utils/normalize-topic-description";
import { toTopicListItem } from "../utils/to-topic-list-item";

export async function createTopic(
  params: CreateTopicParams,
  ctx: WorkspaceContext,
): Promise<CreateTopicResult> {
  const name = params.name.trim();
  const description = normalizeTopicDescription(params.description) ?? null;
  const parentId = params.parentId ?? null;

  if (parentId) {
    await assertValidParent(ctx.workspaceId, parentId);
  }

  await assertUniqueTopicName(ctx.workspaceId, name);

  const [topic] = await db
    .insert(topics)
    .values({
      workspaceId: ctx.workspaceId,
      name,
      description,
      parentId,
      verified: params.verified ?? true,
      createdBy: TOPIC_CREATED_BY.admin,
    })
    .returning();

  if (!topic) {
    throw new CreateFailedError("topic");
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
