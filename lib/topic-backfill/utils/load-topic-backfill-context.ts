import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export type TopicBackfillContext = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  listeningStartedAt: Date;
  activeBackfillRunId: string | null;
};

export async function loadTopicBackfillContext(
  topicId: string,
  workspaceId: string,
): Promise<TopicBackfillContext> {
  const [topic] = await db
    .select({
      id: topics.id,
      workspaceId: topics.workspaceId,
      name: topics.name,
      description: topics.description,
      createdAt: topics.createdAt,
      listeningStartedAt: topics.listeningStartedAt,
      activeBackfillRunId: topics.activeBackfillRunId,
    })
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.workspaceId, workspaceId)))
    .limit(1);

  if (!topic) {
    throw new NotFoundError("topic", topicId);
  }

  return topic;
}

export function assertValidBackfillListeningDate(
  newListeningStartedAt: Date,
  topicCreatedAt: Date,
): void {
  if (newListeningStartedAt.getTime() > topicCreatedAt.getTime()) {
    throw new UnknownServiceError(
      "Listening start date cannot be after the topic created date.",
    );
  }
}
