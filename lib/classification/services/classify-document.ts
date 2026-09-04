import { and, eq } from "drizzle-orm";

import { documentTopics, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { invalidateTopicDigest } from "@/lib/topic-digests/services/invalidate-topic-digest";
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

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function fetchLlmTopicIds(documentId: string): Promise<string[]> {
  const rows = await db
    .select({ topicId: documentTopics.topicId })
    .from(documentTopics)
    .where(
      and(
        eq(documentTopics.documentId, documentId),
        eq(documentTopics.assignedBy, LLM_ASSIGNED_BY),
      ),
    );
  return rows.map((r) => r.topicId);
}

async function invalidateAffectedDigests(
  topicIds: string[],
  publishedAt: Date | null,
): Promise<void> {
  if (!publishedAt || topicIds.length === 0) return;
  const dateKey = toDateKey(publishedAt);
  await Promise.all(
    topicIds.map((topicId) => invalidateTopicDigest({ topicId, dateKey })),
  );
}

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
 *   2. Ask the LLM to select matching topics; when none fit, propose a new topic.
 *   3. Assign existing topics, or auto-create a proposed topic and assign it immediately.
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

  // Capture LLM-assigned topic IDs before clearing so they can be
  // invalidated — their doc counts will drop after the reassignment.
  const oldTopicIds = await fetchLlmTopicIds(documentId);

  await clearLlmAssignments(documentId);

  const classifierTopics = await loadTopicsForClassifier(doc.workspaceId);
  const llmSettings = await getWorkspaceLlmSettings(doc.workspaceId);

  let result: ClassifyDocumentResult;

  if (classifierTopics.length === 0) {
    const proposed = await proposeTopicWithLlm(docContext, llmSettings);
    result = await assignProposedTopic(doc.workspaceId, documentId, proposed);
  } else {
    const { assignments: llmAssignments } = await classifyWithLlm(
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
      assignments.push({ topicId: topic.id, name: topic.name, confidence });
    }

    if (assignments.length > 0) {
      await assignExistingTopics(documentId, assignments);
      result = { documentId, assignments, createdTopics: [] };
    } else {
      const proposed = await proposeTopicWithLlm(docContext, llmSettings);
      result = await assignProposedTopic(doc.workspaceId, documentId, proposed);
    }
  }

  // Invalidate daily digest rows for every topic whose doc count changed.
  const newTopicIds = [
    ...result.assignments.map((a) => a.topicId),
    ...result.createdTopics.map((t) => t.id),
  ];
  const affectedTopicIds = [...new Set([...oldTopicIds, ...newTopicIds])];
  await invalidateAffectedDigests(affectedTopicIds, doc.publishedAt);

  return result;
}
