import type { Topic } from "@/db/schema";

import type { TopicListItem } from "../types";

export function toTopicListItem(topic: Topic): TopicListItem {
  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    createdBy: topic.createdBy,
    sourceDocumentId: topic.sourceDocumentId,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString(),
  };
}
