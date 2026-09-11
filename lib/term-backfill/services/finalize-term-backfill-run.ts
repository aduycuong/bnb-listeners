import { and, eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import type { TermBackfillRun } from "@/db/schema";
import { db } from "@/lib/db";
import { fetchDigestPartitionsForDocuments } from "@/lib/document-terms/utils/fetch-digest-partitions-for-documents";
import {
  disableChunkTopicTrigger,
  enableChunkTopicTrigger,
} from "@/lib/document-terms/utils/chunk-term-trigger";
import { syncChunkTermsForDocuments } from "@/lib/document-terms/utils/sync-chunk-terms-for-documents";
import { bulkInvalidateTermDigestPartitions } from "@/lib/term-digests/services/bulk-invalidate-term-digest-partitions";

import { fetchBackfillAssignedDocumentIds } from "../utils/fetch-backfill-assigned-document-ids";

export async function finalizeTermBackfillRun(params: {
  run: TermBackfillRun;
  success: boolean;
}): Promise<void> {
  const { run, success } = params;

  const assignedDocumentIds = await fetchBackfillAssignedDocumentIds({
    termId: run.termId,
    startedAt: run.startedAt,
  });

  if (assignedDocumentIds.length > 0) {
    let triggerDisabled = false;

    try {
      await disableChunkTopicTrigger();
      triggerDisabled = true;
      await syncChunkTermsForDocuments(assignedDocumentIds);
    } finally {
      if (triggerDisabled) {
        await enableChunkTopicTrigger();
      }
    }

    const partitions = await fetchDigestPartitionsForDocuments(
      assignedDocumentIds,
    );

    await bulkInvalidateTermDigestPartitions({
      termId: run.termId,
      partitions,
    });
  }

  if (success) {
    await db
      .update(terms)
      .set({
        listeningStartedAt: run.newListeningStartedAt,
        activeBackfillRunId: null,
      })
      .where(eq(terms.id, run.termId));
  } else {
    await db
      .update(terms)
      .set({ activeBackfillRunId: null })
      .where(
        and(eq(terms.id, run.termId), eq(terms.activeBackfillRunId, run.id)),
      );
  }
}
