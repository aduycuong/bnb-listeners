import { documentTopics, topics } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { CreatedTopic, ProposedTopic } from "../types";

const LLM_ASSIGNED_BY = "llm_classifier";

/**
 * Creates a topic from an LLM proposal and assigns the source document.
 * New topics are usable immediately; admin marks verified when reviewed.
 */
export async function createAutoTopic(
  workspaceId: string,
  documentId: string,
  proposed: ProposedTopic,
): Promise<CreatedTopic> {
  const [topic] = await db
    .insert(topics)
    .values({
      workspaceId,
      name: proposed.name.trim(),
      description: proposed.description.trim(),
      verified: false,
      createdBy: LLM_ASSIGNED_BY,
      sourceDocumentId: documentId,
    })
    .returning({
      id: topics.id,
      name: topics.name,
    });

  if (!topic) {
    throw new CreateFailedError("topic");
  }

  await db
    .insert(documentTopics)
    .values({
      documentId,
      topicId: topic.id,
      confidence: 1,
      assignedBy: LLM_ASSIGNED_BY,
    })
    .onConflictDoNothing();

  return topic;
}
