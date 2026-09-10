import { z } from "zod";

import { QUALITY_SCORE_THRESHOLD } from "@/lib/chunking/config";
import { rebuildDocumentChunks } from "@/lib/chunking/services/rebuild-document-chunks";
import { classifyDocument } from "@/lib/classification/services/classify-document";
import { scoreDocument } from "@/lib/scoring/services/score-document";

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
 *   4. Chunk — split content and media, embed, and replace the document's chunks.
 *      Skipped when quality is below the threshold.
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
    .map(({ name, confidence }) => `${name}=${confidence.toFixed(2)}`)
    .join(", ");

  const createdLog = classifyResult.createdTopics
    .map(({ name }) => name)
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

  // Step 3: chunk, embed, and replace
  const { chunksCreated, textChunks, mediaChunks } = await rebuildDocumentChunks({
    documentId,
  });

  console.log(
    `[process-document] Stored chunks for document ${documentId}: ` +
      `chunks=${chunksCreated} (text=${textChunks} media=${mediaChunks})`,
  );
}
