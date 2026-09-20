import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { DOCUMENT_TERM_ASSIGNED_BY } from "../document-term-config";
import { fetchDigestPartitionsForSourceTerms } from "../utils/fetch-digest-partitions-for-source-terms";
import { invalidateTermDigestsForPartitions } from "../utils/invalidate-term-digests-for-partitions";
import type {
  AddDocumentTermAssignmentsFromSourcesParams,
  AddDocumentTermAssignmentsFromSourcesResult,
} from "../types";

/**
 * Copy document assignments from source terms onto a target term, then
 * invalidate the target's daily digest partitions for every affected day/job.
 *
 * Runs as a single set-based INSERT ... SELECT; documents already assigned to
 * the target are skipped via ON CONFLICT DO NOTHING.
 */
export async function addDocumentTermAssignmentsFromSources(
  params: AddDocumentTermAssignmentsFromSourcesParams,
): Promise<AddDocumentTermAssignmentsFromSourcesResult> {
  const sourceTermIds = [...new Set(params.sourceTermIds)];
  const { targetTermId } = params;

  if (sourceTermIds.length === 0) {
    return { documentsAssigned: 0, partitionsInvalidated: 0 };
  }

  const partitions = await fetchDigestPartitionsForSourceTerms(sourceTermIds);

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

  const partitionsInvalidated = await invalidateTermDigestsForPartitions(
    targetTermId,
    partitions,
  );

  return {
    documentsAssigned: insertResult.rows.length,
    partitionsInvalidated,
  };
}
