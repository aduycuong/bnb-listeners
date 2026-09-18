import { eq } from "drizzle-orm";
import { z } from "zod";

import { documents } from "@/db/schema";
import { deleteDocumentChunks } from "@/lib/chunking/services/delete-document-chunks";
import { rebuildDocumentChunks } from "@/lib/chunking/services/rebuild-document-chunks";
import { classifyDocument } from "@/lib/classification/services/classify-document";
import { db } from "@/lib/db";
import { scoreDocument } from "@/lib/scoring/services/score-document";

export const processDocumentPayloadSchema = z.object({
  documentId: z.uuid({ error: "documentId must be a valid UUID" }),
});

export type ProcessDocumentPayload = z.infer<
  typeof processDocumentPayloadSchema
>;

/**
 * QStash dataSource handler: process a newly created or updated document.
 *
 * Steps:
 *   1. Validate payload.
 *   2. Drop the document's existing chunks so nothing stale survives a re-run.
 *   3. Score — rebuild parts (text + each image/video), archive media on R2,
 *      score every part independently on relevance + detail.
 *   4. If no part is eligible: mark the document `rejected` and stop.
 *   5. Classify — assign terms from the eligible parts only.
 *   6. Chunk — split and embed the eligible parts, write chunks with term ids.
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

  // Step 1: clear the index for this document before anything else runs.
  const { deleted } = await deleteDocumentChunks({ documentId });
  if (deleted > 0) {
    console.log(
      `[process-document] Removed ${deleted} existing chunk(s) for document ${documentId}`,
    );
  }

  // Step 2: parts + per-part scoring
  const scoreResult = await scoreDocument({ documentId });

  for (const part of scoreResult.parts) {
    const scores =
      part.relevanceScore != null && part.detailScore != null
        ? `rel=${part.relevanceScore.toFixed(2)} det=${part.detailScore.toFixed(2)}`
        : "rel=- det=-";
    const error = part.scoreError ? ` error="${part.scoreError}"` : "";

    console.log(
      `[process-document] part=${part.partIndex} type=${part.contentType} ` +
        `${scores} eligible=${part.isEligible} source=${part.scoreSource}${error}`,
    );
  }

  console.log(
    `[process-document] Scored document ${documentId}: ` +
      `quality=${scoreResult.qualityScore} eligible=${scoreResult.eligibleCount}/${scoreResult.parts.length}`,
  );

  if (scoreResult.eligibleCount === 0) {
    await db
      .update(documents)
      .set({ embeddingStatus: "rejected" })
      .where(eq(documents.id, documentId));

    console.log(
      `[process-document] Document ${documentId} has no eligible part — rejected, skipping classify and chunks`,
    );
    return;
  }

  // Step 3: term classification on eligible parts
  const classifyResult = await classifyDocument({ documentId });

  const termLog = classifyResult.assignments
    .map(({ name, confidence }) => `${name}=${confidence.toFixed(2)}`)
    .join(", ");

  const createdLog = classifyResult.createdTerms
    .map(({ name }) => name)
    .join(", ");

  if (classifyResult.createdTerms.length > 0) {
    console.log(
      `[process-document] Classified document ${documentId}: ` +
        `created terms=[${createdLog}]`,
    );
  } else {
    console.log(
      `[process-document] Classified document ${documentId}: terms=[${termLog}]`,
    );
  }

  // Step 4: chunk, embed, and store
  const { chunksCreated, textChunks, mediaChunks } = await rebuildDocumentChunks({
    documentId,
  });

  console.log(
    `[process-document] Stored chunks for document ${documentId}: ` +
      `chunks=${chunksCreated} (text=${textChunks} media=${mediaChunks})`,
  );
}
