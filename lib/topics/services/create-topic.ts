import { eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { TOPIC_CREATED_BY } from "../topic-config";
import type { CreateTopicParams, CreateTopicResult } from "../types";
import { assertUniqueTopicName } from "../utils/assert-unique-topic-name";
import { normalizeTopicDescription } from "../utils/normalize-topic-description";
import { toTopicListItem } from "../utils/to-topic-list-item";

export async function createTopic(
  params: CreateTopicParams,
  ctx: WorkspaceContext,
): Promise<CreateTopicResult> {
  const name = params.name.trim();
  const description = normalizeTopicDescription(params.description) ?? null;

  await assertUniqueTopicName(ctx.workspaceId, name);

  const [topic] = await db
    .insert(topics)
    .values({
      workspaceId: ctx.workspaceId,
      name,
      description,
      createdBy: TOPIC_CREATED_BY.admin,
    })
    .returning();

  if (!topic) {
    throw new CreateFailedError("topic");
  }

  return toTopicListItem(topic);
}
