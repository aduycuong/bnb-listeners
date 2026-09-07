import { sql } from "drizzle-orm";

import { documentTopics } from "@/db/schema";
import { db } from "@/lib/db";

import {
  BULK_ASSIGN_DOCUMENT_TOPICS_THRESHOLD,
  DOCUMENT_TOPIC_ASSIGNED_BY,
  DOCUMENT_TOPIC_INSERT_BATCH_SIZE,
} from "../document-topic-config";
import { countDocumentsForSourceTopics } from "../utils/count-documents-for-source-topics";
import {
  disableChunkTopicTrigger,
  enableChunkTopicTrigger,
} from "../utils/chunk-topic-trigger";
import { fetchDigestPartitionsForSourceTopics } from "../utils/fetch-digest-partitions-for-source-topics";
import { fetchDocumentIdsForSourceTopics } from "../utils/fetch-document-ids-for-source-topics";
import { invalidateTopicDigestsForPartitions } from "../utils/invalidate-topic-digests-for-partitions";
import { syncChunkTopicsForDocuments } from "../utils/sync-chunk-topics-for-documents";
import type {
  AddDocumentTopicAssignmentsFromSourcesParams,
  AddDocumentTopicAssignmentsFromSourcesResult,
} from "../types";

async function bulkInsertAssignmentsWithTriggerDisabled(
  sourceTopicIds: string[],
  targetTopicId: string,
  documentIds: string[],
): Promise<number> {
  let triggerDisabled = false;

  try {
    await disableChunkTopicTrigger();
    triggerDisabled = true;

    const insertResult = await db.execute<{ document_id: string }>(sql`
      INSERT INTO document_topics (document_id, topic_id, confidence, assigned_by)
      SELECT DISTINCT
        dt.document_id,
        ${targetTopicId}::uuid,
        1,
        ${DOCUMENT_TOPIC_ASSIGNED_BY.adminMerge}
      FROM document_topics dt
      WHERE dt.topic_id = ANY(ARRAY[${sql.join(
        sourceTopicIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])
      ON CONFLICT (document_id, topic_id) DO NOTHING
      RETURNING document_id
    `);

    await syncChunkTopicsForDocuments(documentIds);

    return insertResult.rows.length;
  } finally {
    if (triggerDisabled) {
      await enableChunkTopicTrigger();
    }
  }
}

async function insertAssignmentsWithTrigger(
  sourceTopicIds: string[],
  targetTopicId: string,
  documentIds: string[],
): Promise<number> {
  let inserted = 0;

  for (let offset = 0; offset < documentIds.length; offset += DOCUMENT_TOPIC_INSERT_BATCH_SIZE) {
    const batch = documentIds.slice(offset, offset + DOCUMENT_TOPIC_INSERT_BATCH_SIZE);

    const result = await db
      .insert(documentTopics)
      .values(
        batch.map((documentId) => ({
          documentId,
          topicId: targetTopicId,
          confidence: 1,
          assignedBy: DOCUMENT_TOPIC_ASSIGNED_BY.adminMerge,
        })),
      )
      .onConflictDoNothing()
      .returning({ documentId: documentTopics.documentId });

    inserted += result.length;
  }

  return inserted;
}

/**
 * Copy document assignments from source topics onto a target topic, then
 * invalidate the target's daily digest partitions for every affected day/job.
 *
 * For large volumes, disables trg_sync_chunk_topics during the bulk INSERT and
 * batch-resyncs chunks afterward. Falls back to batched inserts with the
 * trigger enabled when disable is not permitted.
 */
export async function addDocumentTopicAssignmentsFromSources(
  params: AddDocumentTopicAssignmentsFromSourcesParams,
): Promise<AddDocumentTopicAssignmentsFromSourcesResult> {
  const sourceTopicIds = [...new Set(params.sourceTopicIds)];
  const { targetTopicId } = params;

  if (sourceTopicIds.length === 0) {
    return { documentsAssigned: 0, partitionsInvalidated: 0 };
  }

  const documentCount = await countDocumentsForSourceTopics(sourceTopicIds);
  if (documentCount === 0) {
    return { documentsAssigned: 0, partitionsInvalidated: 0 };
  }

  const partitions = await fetchDigestPartitionsForSourceTopics(sourceTopicIds);
  const documentIds = await fetchDocumentIdsForSourceTopics(sourceTopicIds);

  let documentsAssigned = 0;

  if (documentCount >= BULK_ASSIGN_DOCUMENT_TOPICS_THRESHOLD) {
    try {
      documentsAssigned = await bulkInsertAssignmentsWithTriggerDisabled(
        sourceTopicIds,
        targetTopicId,
        documentIds,
      );
    } catch {
      documentsAssigned = await insertAssignmentsWithTrigger(
        sourceTopicIds,
        targetTopicId,
        documentIds,
      );
    }
  } else {
    documentsAssigned = await insertAssignmentsWithTrigger(
      sourceTopicIds,
      targetTopicId,
      documentIds,
    );
  }

  const partitionsInvalidated = await invalidateTopicDigestsForPartitions(
    targetTopicId,
    partitions,
  );

  return { documentsAssigned, partitionsInvalidated };
}
