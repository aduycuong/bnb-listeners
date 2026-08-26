import { and, eq } from "drizzle-orm";

import { documentTopics, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { findTopicByName } from "@/lib/topics/utils/find-topic-by-name";
import { getWorkspaceLlmSettings } from "@/lib/workspaces/services/get-workspace-llm-settings";

import type {
  ClassifyDocumentParams,
  ClassifyDocumentResult,
  TopicAssignment,
} from "../types";
import { classifyWithLlm } from "../utils/classify-with-llm";
import { createAutoTopic } from "../utils/create-auto-topic";
import { loadTopicsForClassifier } from "../utils/load-topics-for-classifier";
import { proposeTopicWithLlm } from "../utils/propose-topic-with-llm";

const LLM_ASSIGNED_BY = "llm_classifier";

async function clearLlmAssignments(documentId: string): Promise<void> {
  await db
    .delete(documentTopics)
    .where(
      and(
        eq(documentTopics.documentId, documentId),
        eq(documentTopics.assignedBy, LLM_ASSIGNED_BY),
      ),
    );
}

async function assignExistingTopics(
  documentId: string,
  assignments: TopicAssignment[],
): Promise<void> {
  await db
    .insert(documentTopics)
    .values(
      assignments.map((assignment) => ({
        documentId,
        topicId: assignment.topicId,
        confidence: assignment.confidence,
        assignedBy: LLM_ASSIGNED_BY,
      })),
    )
    .onConflictDoNothing();
}

async function assignProposedTopic(
  workspaceId: string,
  documentId: string,
  proposed: { name: string; description: string },
): Promise<ClassifyDocumentResult> {
  const name = proposed.name.trim();
  const existing = await findTopicByName(workspaceId, name);

  if (existing) {
    const assignments: TopicAssignment[] = [
      {
        topicId: existing.id,
        name: existing.name,
        confidence: 1,
      },
    ];
    await assignExistingTopics(documentId, assignments);
    return { documentId, assignments, createdTopics: [] };
  }

  const createdTopic = await createAutoTopic(workspaceId, documentId, {
    name,
    description: proposed.description,
  });

  return {
    documentId,
    assignments: [],
    createdTopics: [createdTopic],
  };
}

/**
 * Classifies a document against existing topics using an LLM.
 *
 * Steps:
 *   1. Fetch the document and all topics (including LLM-created, unverified).
 *   2. Ask the LLM to select matching topics, or propose a new one when none fit.
 *   3. Assign existing topics, or auto-create a topic and assign it immediately.
 *      If the proposed name already exists, assign that topic instead.
 *
 * Only prior LLM assignments are replaced; admin assignments are preserved.
 */
export async function classifyDocument(
  params: ClassifyDocumentParams,
): Promise<ClassifyDocumentResult> {
  const { documentId } = params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw new NotFoundError("document", documentId);
  }

  const docContext = {
    title: doc.title,
    rawContent: doc.rawContent,
    docType: doc.docType,
    sourceName: doc.sourceName,
  };

  await clearLlmAssignments(documentId);

  const classifierTopics = await loadTopicsForClassifier(doc.workspaceId);
  const llmSettings = await getWorkspaceLlmSettings(doc.workspaceId);

  if (classifierTopics.length === 0) {
    const proposed = await proposeTopicWithLlm(docContext, llmSettings);
    return assignProposedTopic(doc.workspaceId, documentId, proposed);
  }

  const { assignments: llmAssignments, proposedTopic } = await classifyWithLlm(
    docContext,
    classifierTopics,
    llmSettings,
  );

  const topicById = new Map(
    classifierTopics.map((topic) => [topic.id, topic]),
  );
  const assignments: TopicAssignment[] = [];

  for (const { id, confidence } of llmAssignments) {
    const topic = topicById.get(id);
    if (!topic) continue;

    assignments.push({
      topicId: topic.id,
      name: topic.name,
      confidence,
    });
  }

  if (assignments.length > 0) {
    await assignExistingTopics(documentId, assignments);

    return { documentId, assignments, createdTopics: [] };
  }

  const proposed =
    proposedTopic ?? (await proposeTopicWithLlm(docContext, llmSettings));
  return assignProposedTopic(doc.workspaceId, documentId, proposed);
}
