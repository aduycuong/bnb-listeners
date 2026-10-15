import { and, eq, ne } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { TopicStatus } from "../config";
import type { TopicSummary, UpdateTopicParams } from "../types";

/** Renames, describes, hides or shows a topic. Hidden topics still receive mentions (D15). */
export async function updateTopic(params: UpdateTopicParams): Promise<TopicSummary> {
  const [row] = await db
    .update(topics)
    .set({
      ...(params.name !== undefined ? { name: params.name } : {}),
      ...(params.description !== undefined ? { description: params.description } : {}),
      ...(params.status !== undefined ? { status: params.status } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(topics.id, params.topicId),
        eq(topics.projectId, params.projectId),
        ne(topics.status, "merged"),
      ),
    )
    .returning({ id: topics.id, name: topics.name, status: topics.status });
  if (!row) throw new NotFoundError("topic", params.topicId);
  return { ...row, status: row.status as TopicStatus };
}
