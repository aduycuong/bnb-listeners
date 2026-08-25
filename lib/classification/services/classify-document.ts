import { and, eq } from "drizzle-orm";

import { documentTopics, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

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
  await db.insert(documentTopics).values(
    assignments.map((assignment) => ({
      documentId,
      topicId: assignment.topicId,
      confidence: assignment.confidence,
      assignedBy: LLM_ASSIGNED_BY,
    })),
  );
}

/**
 * Classifies a document against existing topics using an LLM.
 *
 * Steps:
 *   1. Fetch the document and all topics (including LLM-created, unverified).
 *   2. Ask the LLM to select matching topics, or propose a new one when none fit.
 *   3. Assign existing topics, or auto-create a topic and assign it immediately.
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

  if (classifierTopics.length === 0) {
    const proposed = await proposeTopicWithLlm(docContext);
    const createdTopic = await createAutoTopic(
      doc.workspaceId,
      documentId,
      proposed,
    );

    return {
      documentId,
      assignments: [],
      createdTopics: [createdTopic],
    };
  }

  const { assignments: llmAssignments, proposedTopic } =
    await classifyWithLlm(docContext, classifierTopics);

  const topicBySlug = new Map(
    classifierTopics.map((topic) => [topic.slug, topic]),
  );
  const assignments: TopicAssignment[] = [];

  for (const { slug, confidence } of llmAssignments) {
    const topic = topicBySlug.get(slug);
    if (!topic) continue;

    assignments.push({
      topicId: topic.id,
      slug: topic.slug,
      confidence,
    });
  }

  if (assignments.length > 0) {
    await assignExistingTopics(documentId, assignments);

    return { documentId, assignments, createdTopics: [] };
  }

  const proposed =
    proposedTopic ?? (await proposeTopicWithLlm(docContext));
  const createdTopic = await createAutoTopic(
    doc.workspaceId,
    documentId,
    proposed,
  );

  return {
    documentId,
    assignments: [],
    createdTopics: [createdTopic],
  };
}
