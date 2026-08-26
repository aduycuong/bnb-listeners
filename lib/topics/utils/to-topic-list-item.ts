import type { Topic } from "@/db/schema";

import type { TopicListItem } from "../types";

export function toTopicListItem(
  topic: Topic,
  parentName: string | null,
): TopicListItem {
  return {
    id: topic.id,
    name: topic.name,
    parentId: topic.parentId,
    parentName,
    description: topic.description,
    verified: topic.verified,
    createdBy: topic.createdBy,
    sourceDocumentId: topic.sourceDocumentId,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  };
}
