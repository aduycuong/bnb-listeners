import { and, eq, inArray } from "drizzle-orm";

import { mentionTopics, topics } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { isTopicStageKind, type TopicStatus } from "../config";
import type { MergeTopicsParams, TopicSummary } from "../types";
import { refreshTopicStats } from "./refresh-topic-stats";

/** Moves every mention of one topic into another; the source becomes `merged` (D15). */
export async function mergeTopics(params: MergeTopicsParams): Promise<TopicSummary> {
  if (params.sourceId === params.targetId) {
    throw new InvalidInputError("A topic cannot be merged into itself.");
  }
  const rows = await db
    .select({ id: topics.id, name: topics.name, status: topics.status, kind: topics.kind })
    .from(topics)
    .where(
      and(
        eq(topics.projectId, params.projectId),
        inArray(topics.id, [params.sourceId, params.targetId]),
      ),
    );
  const source = rows.find((row) => row.id === params.sourceId);
  const target = rows.find((row) => row.id === params.targetId);
  if (!source) throw new NotFoundError("topic", params.sourceId);
  if (!target) throw new NotFoundError("topic", params.targetId);
  if (source.status === "merged" || target.status === "merged") {
    throw new InvalidInputError("Merged topics cannot be merged again.");
  }
  if (source.kind !== target.kind) {
    throw new InvalidInputError("Topics of different kinds cannot be merged.");
  }

  await db.batch([
    db.update(mentionTopics).set({ topicId: target.id }).where(eq(mentionTopics.topicId, source.id)),
    db
      .update(topics)
      .set({ mergedIntoId: target.id, updatedAt: new Date() })
      .where(eq(topics.mergedIntoId, source.id)),
    db
      .update(topics)
      .set({ status: "merged", mergedIntoId: target.id, mentionCount: 0, updatedAt: new Date() })
      .where(eq(topics.id, source.id)),
  ]);
  const kind = isTopicStageKind(target.kind) ? target.kind : undefined;
  await refreshTopicStats({ projectId: params.projectId, kind, topicIds: [target.id] });

  return { id: target.id, name: target.name, status: target.status as TopicStatus };
}
