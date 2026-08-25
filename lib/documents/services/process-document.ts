import { eq } from "drizzle-orm";
import { z } from "zod";

import { chunks, documents } from "@/db/schema";
import { db } from "@/lib/db";
import { QUALITY_SCORE_THRESHOLD } from "@/lib/chunking/config";
import { embedChunks } from "@/lib/chunking/services/embed-chunks";
import { storeChunks } from "@/lib/chunking/services/store-chunks";
import { classifyDocument } from "@/lib/classification/services/classify-document";
import { scoreDocument } from "@/lib/scoring/services/score-document";
import { detectNearDuplicate } from "@/lib/chunking/utils/detect-near-duplicate";

export const processDocumentPayloadSchema = z.object({
  documentId: z.uuid({ error: "documentId must be a valid UUID" }),
});

export type ProcessDocumentPayload = z.infer<
  typeof processDocumentPayloadSchema
>;

/**
 * QStash job handler: process a newly created document.
 *
 * Steps:
 *   1. Validate payload.
 *   2. Score — compute quality_score across all dimensions.
 *   3. Classify — assign topics via LLM, or auto-create a new topic when none match.
 *      If quality is below the threshold, stop — no chunks are written.
 *   4. Embed — split content by doc_type strategy and generate embeddings in memory.
 *   5. Near-duplicate check — compare embeddings against existing chunks before any
 *      DB write. If a duplicate is found, the document is marked and no chunks are written.
 *   6. Store — delete old chunks, insert new ones with quality_score denormalized,
 *      and mark embedding_status = 'chunked'.
 */
export async function processDocument(payload: unknown): Promise<void> {
  const parsed = processDocumentPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[process-document] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  const { documentId } = parsed.data;

  console.log(`[process-document] Starting for document ${documentId}`);

  // Step 1: quality scoring
  const scoreResult = await scoreDocument({ documentId });

  const dimensionLog = Object.entries(scoreResult.dimensions)
    .map(([key, { score }]) => `${key}=${score.toFixed(3)}`)
    .join(" ");

  console.log(
    `[process-document] Scored document ${documentId}: ` +
      `quality=${scoreResult.qualityScore} | ${dimensionLog}`,
  );

  // Step 2: topic classification
  const classifyResult = await classifyDocument({ documentId });

  const topicLog = classifyResult.assignments
    .map(({ slug, confidence }) => `${slug}=${confidence.toFixed(2)}`)
    .join(", ");

  const createdLog = classifyResult.createdTopics
    .map(({ slug, name }) => `${slug} (${name})`)
    .join(", ");

  if (classifyResult.createdTopics.length > 0) {
    console.log(
      `[process-document] Classified document ${documentId}: ` +
        `created topics=[${createdLog}]`,
    );
  } else {
    console.log(
      `[process-document] Classified document ${documentId}: topics=[${topicLog}]`,
    );
  }

  if (scoreResult.qualityScore < QUALITY_SCORE_THRESHOLD) {
    console.log(
      `[process-document] Document ${documentId} below quality threshold ` +
        `(${scoreResult.qualityScore.toFixed(3)} < ${QUALITY_SCORE_THRESHOLD}) — skipping chunks`,
    );
    return;
  }

  // Step 2: split + embed (no DB writes)
  const { retrievalChunks, vectors, strategy, docType, createdAt, publishedAt } =
    await embedChunks(documentId);

  console.log(
    `[process-document] Embedded document ${documentId}: ` +
      `chunks=${retrievalChunks.length} strategy=${strategy}`,
  );

  // Step 3: near-duplicate check (pre-write — no chunks in DB yet)
  const dupResult = await detectNearDuplicate({ documentId, embeddings: vectors, publishedAt, createdAt });
  console.log(`[process-document] Near-duplicate check result: ${JSON.stringify(dupResult)}`);

  if (dupResult.hasMatch) {
    const { canonicalId, duplicateId } = dupResult;

    if (duplicateId === documentId) {
      // Current document is the newer duplicate — mark it and stop.
      await db
        .update(documents)
        .set({ isDuplicate: true, canonicalId, embeddingStatus: "skipped" })
        .where(eq(documents.id, documentId));

      console.log(
        `[process-document] Document ${documentId} is a near-duplicate of ` +
          `${canonicalId} — document marked, no chunks written`,
      );
      return;
    }

    // Current document is the older canonical — the already-processed candidate
    // is the duplicate. Mark it and purge its chunks so only the canonical is indexed.
    await db
      .update(documents)
        .set({ isDuplicate: true, canonicalId: documentId, embeddingStatus: "skipped" })
      .where(eq(documents.id, duplicateId!));

    await db.delete(chunks).where(eq(chunks.documentId, duplicateId!));

    // Re-point any documents that were already referencing duplicateId as their
    // canonical — they should now point to the true canonical (documentId).
    await db
      .update(documents)
      .set({ canonicalId: documentId })
      .where(eq(documents.canonicalId, duplicateId!));

    console.log(
      `[process-document] Document ${duplicateId} re-classified as near-duplicate of ` +
        `${documentId} — its chunks purged, continuing to index canonical`,
    );
  }

  // Step 4: persist chunks
  const chunksCreated = await storeChunks({
    documentId,
    retrievalChunks,
    vectors,
    qualityScore: scoreResult.qualityScore,
    docType,
    publishedAt,
  });

  console.log(
    `[process-document] Stored chunks for document ${documentId}: chunks=${chunksCreated}`,
  );
}
