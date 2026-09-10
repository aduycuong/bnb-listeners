import { and, eq } from "drizzle-orm";

import { documents } from "@/db/schema";
import { ZERO_ENGAGEMENT_COUNTS } from "@/lib/common/engagement-counts";
import { db } from "@/lib/db";
import { addJob } from "@/lib/qstash/services/add-job-service";

import type { UpsertDocumentParams, UpsertDocumentResult } from "../types";

/**
 * Upserts a document identified by (workspaceId, docType, sourceKey, sourceId):
 *
 *   inserted   — no existing document found; created and process-document dispatched.
 *   updated    — rawContent changed; embeddingStatus reset to "pending" and
 *                process-document dispatched.
 *   unchanged  — rawContent identical; metadata and engagement refreshed only.
 *                No re-embed, no QStash dispatch — chunk engagement is mirrored
 *                by trg_sync_chunk_engagement.
 *
 * @param userId  Passed to QStash for audit; defaults to "system" for background
 *                jobs that run without a human session (webhooks, crons).
 */
export async function upsertDocument(
  params: UpsertDocumentParams,
  workspaceId: string,
  userId = "system",
): Promise<UpsertDocumentResult> {
  const newPublishedAt = params.publishedAt ? new Date(params.publishedAt) : null;
  const engagement = params.engagement ?? ZERO_ENGAGEMENT_COUNTS;

  const [existing] = await db
    .select({ id: documents.id, rawContent: documents.rawContent })
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, workspaceId),
        eq(documents.docType, params.docType),
        eq(documents.sourceKey, params.sourceKey),
        eq(documents.sourceId, params.sourceId),
      ),
    )
    .limit(1);

  if (!existing) {
    const [doc] = await db
      .insert(documents)
      .values({
        workspaceId,
        docType: params.docType,
        sourceKey: params.sourceKey,
        sourceName: params.sourceName,
        sourceId: params.sourceId,
        title: params.title,
        rawContent: params.rawContent,
        metadata: params.metadata ?? {},
        ...engagement,
        publishedAt: newPublishedAt,
        embeddingStatus: "pending",
        jobRunId: params.jobRunId ?? null,
        jobId: params.jobId,
      })
      .returning({ id: documents.id });

    if (!doc) {
      throw new Error(
        `[upsert-document] Insert failed for ${params.docType}/${params.sourceId}`,
      );
    }

    await addJob({
      jobName: "process-document",
      payload: { documentId: doc.id },
      userId,
    });

    return { documentId: doc.id, outcome: "inserted" };
  }

  if (existing.rawContent !== params.rawContent) {
    await db
      .update(documents)
      .set({
        title: params.title,
        rawContent: params.rawContent,
        metadata: params.metadata ?? {},
        ...engagement,
        publishedAt: newPublishedAt,
        embeddingStatus: "pending",
      })
      .where(eq(documents.id, existing.id));

    await addJob({
      jobName: "process-document",
      payload: { documentId: existing.id },
      userId,
    });

    return { documentId: existing.id, outcome: "updated" };
  }

  // rawContent unchanged — refresh metadata and engagement only, skip re-embed.
  await db
    .update(documents)
    .set({ metadata: params.metadata ?? {}, ...engagement })
    .where(eq(documents.id, existing.id));

  return { documentId: existing.id, outcome: "unchanged" };
}
