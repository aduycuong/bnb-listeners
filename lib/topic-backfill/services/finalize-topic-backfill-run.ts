import { and, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import type { TopicBackfillRun } from "@/db/schema";
import { db } from "@/lib/db";
import { fetchDigestPartitionsForDocuments } from "@/lib/document-topics/utils/fetch-digest-partitions-for-documents";
import {
  disableChunkTopicTrigger,
  enableChunkTopicTrigger,
} from "@/lib/document-topics/utils/chunk-topic-trigger";
import { syncChunkTopicsForDocuments } from "@/lib/document-topics/utils/sync-chunk-topics-for-documents";
import { bulkInvalidateTopicDigestPartitions } from "@/lib/topic-digests/services/bulk-invalidate-topic-digest-partitions";

import { fetchBackfillAssignedDocumentIds } from "../utils/fetch-backfill-assigned-document-ids";

export async function finalizeTopicBackfillRun(params: {
  run: TopicBackfillRun;
  success: boolean;
}): Promise<void> {
  const { run, success } = params;

  const assignedDocumentIds = await fetchBackfillAssignedDocumentIds({
    topicId: run.topicId,
    startedAt: run.startedAt,
  });

  if (assignedDocumentIds.length > 0) {
    let triggerDisabled = false;

    try {
      await disableChunkTopicTrigger();
      triggerDisabled = true;
      await syncChunkTopicsForDocuments(assignedDocumentIds);
    } finally {
      if (triggerDisabled) {
        await enableChunkTopicTrigger();
      }
    }

    const partitions = await fetchDigestPartitionsForDocuments(
      assignedDocumentIds,
    );

    await bulkInvalidateTopicDigestPartitions({
      topicId: run.topicId,
      partitions,
    });
  }

  if (success) {
    await db
      .update(topics)
      .set({
        listeningStartedAt: run.newListeningStartedAt,
        activeBackfillRunId: null,
      })
      .where(eq(topics.id, run.topicId));
  } else {
    await db
      .update(topics)
      .set({ activeBackfillRunId: null })
      .where(
        and(eq(topics.id, run.topicId), eq(topics.activeBackfillRunId, run.id)),
      );
  }
}
