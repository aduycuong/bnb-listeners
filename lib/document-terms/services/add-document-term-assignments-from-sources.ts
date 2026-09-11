import { sql } from "drizzle-orm";

import { documentTerms } from "@/db/schema";
import { db } from "@/lib/db";

import {
  BULK_ASSIGN_DOCUMENT_TERMS_THRESHOLD,
  DOCUMENT_TERM_ASSIGNED_BY,
  DOCUMENT_TERM_INSERT_BATCH_SIZE,
} from "../document-term-config";
import { countDocumentsForSourceTerms } from "../utils/count-documents-for-source-terms";
import {
  disableChunkTermTrigger,
  enableChunkTermTrigger,
} from "../utils/chunk-term-trigger";
import { fetchDigestPartitionsForSourceTerms } from "../utils/fetch-digest-partitions-for-source-terms";
import { fetchDocumentIdsForSourceTerms } from "../utils/fetch-document-ids-for-source-terms";
import { invalidateTermDigestsForPartitions } from "../utils/invalidate-term-digests-for-partitions";
import { syncChunkTermsForDocuments } from "../utils/sync-chunk-terms-for-documents";
import type {
  AddDocumentTermAssignmentsFromSourcesParams,
  AddDocumentTermAssignmentsFromSourcesResult,
} from "../types";

async function bulkInsertAssignmentsWithTriggerDisabled(
  sourceTermIds: string[],
  targetTermId: string,
  documentIds: string[],
): Promise<number> {
  let triggerDisabled = false;

  try {
    await disableChunkTermTrigger();
    triggerDisabled = true;

    const insertResult = await db.execute<{ document_id: string }>(sql`
      INSERT INTO document_terms (document_id, term_id, confidence, assigned_by)
      SELECT DISTINCT
        dt.document_id,
        ${targetTermId}::uuid,
        1,
        ${DOCUMENT_TERM_ASSIGNED_BY.adminMerge}
      FROM document_terms dt
      WHERE dt.term_id = ANY(ARRAY[${sql.join(
        sourceTermIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])
      ON CONFLICT (document_id, term_id) DO NOTHING
      RETURNING document_id
    `);

    await syncChunkTermsForDocuments(documentIds);

    return insertResult.rows.length;
  } finally {
    if (triggerDisabled) {
      await enableChunkTermTrigger();
    }
  }
}

async function insertAssignmentsWithTrigger(
  sourceTermIds: string[],
  targetTermId: string,
  documentIds: string[],
): Promise<number> {
  let inserted = 0;

  for (let offset = 0; offset < documentIds.length; offset += DOCUMENT_TERM_INSERT_BATCH_SIZE) {
    const batch = documentIds.slice(offset, offset + DOCUMENT_TERM_INSERT_BATCH_SIZE);

    const result = await db
      .insert(documentTerms)
      .values(
        batch.map((documentId) => ({
          documentId,
          termId: targetTermId,
          confidence: 1,
          assignedBy: DOCUMENT_TERM_ASSIGNED_BY.adminMerge,
        })),
      )
      .onConflictDoNothing()
      .returning({ documentId: documentTerms.documentId });

    inserted += result.length;
  }

  return inserted;
}

/**
 * Copy document assignments from source terms onto a target term, then
 * invalidate the target's daily digest partitions for every affected day/job.
 *
 * For large volumes, disables trg_sync_chunk_terms during the bulk INSERT and
 * batch-resyncs chunks afterward. Falls back to batched inserts with the
 * trigger enabled when disable is not permitted.
 */
export async function addDocumentTermAssignmentsFromSources(
  params: AddDocumentTermAssignmentsFromSourcesParams,
): Promise<AddDocumentTermAssignmentsFromSourcesResult> {
  const sourceTermIds = [...new Set(params.sourceTermIds)];
  const { targetTermId } = params;

  if (sourceTermIds.length === 0) {
    return { documentsAssigned: 0, partitionsInvalidated: 0 };
  }

  const documentCount = await countDocumentsForSourceTerms(sourceTermIds);
  if (documentCount === 0) {
    return { documentsAssigned: 0, partitionsInvalidated: 0 };
  }

  const partitions = await fetchDigestPartitionsForSourceTerms(sourceTermIds);
  const documentIds = await fetchDocumentIdsForSourceTerms(sourceTermIds);

  let documentsAssigned = 0;

  if (documentCount >= BULK_ASSIGN_DOCUMENT_TERMS_THRESHOLD) {
    try {
      documentsAssigned = await bulkInsertAssignmentsWithTriggerDisabled(
        sourceTermIds,
        targetTermId,
        documentIds,
      );
    } catch {
      documentsAssigned = await insertAssignmentsWithTrigger(
        sourceTermIds,
        targetTermId,
        documentIds,
      );
    }
  } else {
    documentsAssigned = await insertAssignmentsWithTrigger(
      sourceTermIds,
      targetTermId,
      documentIds,
    );
  }

  const partitionsInvalidated = await invalidateTermDigestsForPartitions(
    targetTermId,
    partitions,
  );

  return { documentsAssigned, partitionsInvalidated };
}
