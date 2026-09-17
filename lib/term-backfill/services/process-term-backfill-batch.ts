import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { documentTerms, termBackfillRuns, terms } from "@/db/schema";
import { syncDiscussionDocumentTerms } from "@/lib/comments/services/sync-discussion-document-terms";
import { evaluateDocumentsForTerm } from "@/lib/classification/utils/evaluate-documents-for-term";
import { DOCUMENT_TERM_ASSIGNED_BY } from "@/lib/document-terms/document-term-config";
import { fetchDigestPartitionsForDocuments } from "@/lib/document-terms/utils/fetch-digest-partitions-for-documents";
import { db } from "@/lib/db";
import { bulkInvalidateTermDigestPartitions } from "@/lib/term-digests/services/bulk-invalidate-term-digest-partitions";
import { buildEvaluateTermPrompt } from "@/lib/llm/utils/build-system-prompt-from-settings";
import { parseChatModel, type ChatModelId } from "@/lib/langchain";
import { addJob } from "@/lib/qstash/services/add-job-service";
import { getWorkspaceLlmSettings } from "@/lib/workspaces/services/get-workspace-llm-settings";

import {
  DEFAULT_TERM_BACKFILL_MODEL,
  TERM_BACKFILL_BATCH_SIZE,
  TERM_BACKFILL_LLM_BATCH_SIZE,
  TERM_BACKFILL_QSTASH_JOB_NAME,
} from "@/lib/terms/term-backfill-config";
import { fetchBackfillDocumentBatch } from "../utils/fetch-backfill-document-batch";
import { computeTokenCostUsd } from "../utils/estimate-backfill-cost";
import { fetchTermAssignedDocumentIds } from "../utils/fetch-term-assigned-document-ids";
import type { TermBackfillRunProgress } from "../types";
import { finalizeTermBackfillRun } from "./finalize-term-backfill-run";

function passesBackfillThreshold(
  item: { match: boolean; confidence: number },
  confidenceMin: number,
): boolean {
  return item.match && item.confidence >= confidenceMin;
}

export const processTermBackfillBatchPayloadSchema = z.object({
  runId: z.uuid(),
});

async function markRunFailed(runId: string, error: string): Promise<void> {
  const [run] = await db
    .update(termBackfillRuns)
    .set({
      status: "failed",
      error,
      finishedAt: new Date(),
    })
    .where(eq(termBackfillRuns.id, runId))
    .returning();

  if (run) {
    await finalizeTermBackfillRun({ run, success: false });
  }
}

async function dispatchNextBatch(runId: string, userId: string, termId: string) {
  await addJob({
    jobName: TERM_BACKFILL_QSTASH_JOB_NAME,
    payload: { runId },
    userId,
    flowControl: {
      key: `term-backfill-${termId}`,
      parallelism: 1,
    },
  });
}

/**
 * QStash handler: process one batch of documents for a term backfill run.
 */
export async function processTermBackfillBatch(
  payload: unknown,
  context: { userId?: string },
): Promise<void> {
  const parsed = processTermBackfillBatchPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[${TERM_BACKFILL_QSTASH_JOB_NAME}] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  const { runId } = parsed.data;

  const [run] = await db
    .select()
    .from(termBackfillRuns)
    .where(eq(termBackfillRuns.id, runId))
    .limit(1);

  if (!run) {
    console.warn(`[${TERM_BACKFILL_QSTASH_JOB_NAME}] Run not found: ${runId}`);
    return;
  }

  if (run.status === "cancelled" || run.status === "success" || run.status === "failed") {
    return;
  }

  if (run.status === "pending") {
    await db
      .update(termBackfillRuns)
      .set({ status: "running" })
      .where(eq(termBackfillRuns.id, runId));
  }

  const [term] = await db
    .select({
      id: terms.id,
      name: terms.name,
      description: terms.description,
      workspaceId: terms.workspaceId,
    })
    .from(terms)
    .where(eq(terms.id, run.termId))
    .limit(1);

  if (!term) {
    await markRunFailed(runId, "Term not found.");
    return;
  }

  const scanContext = {
    workspaceId: run.workspaceId,
    termId: run.termId,
    newListeningStartedAt: run.newListeningStartedAt,
    scanEndAt: run.scanEndAt,
    qualityMin: run.qualityMin,
    includeAlreadyAssigned: run.includeAlreadyAssigned,
  };

  const documents = await fetchBackfillDocumentBatch({
    context: scanContext,
    limit: TERM_BACKFILL_BATCH_SIZE,
    cursor: run.result.cursor,
  });

  if (documents.length === 0) {
    const [completed] = await db
      .update(termBackfillRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        error: null,
      })
      .where(eq(termBackfillRuns.id, runId))
      .returning();

    if (completed) {
      await finalizeTermBackfillRun({ run: completed, success: true });
    }

    return;
  }

  const llmSettings = await getWorkspaceLlmSettings(term.workspaceId);
  const systemPrompt = buildEvaluateTermPrompt(llmSettings, {
    name: term.name,
    description: term.description,
  });
  const model = parseChatModel(run.model, DEFAULT_TERM_BACKFILL_MODEL) as ChatModelId;

  let batchInputTokens = 0;
  let batchOutputTokens = 0;
  let batchMatched = 0;
  let batchUnmatched = 0;
  const affectedParentDocumentIds = new Set<string>();

  try {
    for (
      let offset = 0;
      offset < documents.length;
      offset += TERM_BACKFILL_LLM_BATCH_SIZE
    ) {
      const llmBatch = documents.slice(offset, offset + TERM_BACKFILL_LLM_BATCH_SIZE);
      const evaluation = await evaluateDocumentsForTerm(
        { name: term.name, description: term.description },
        llmBatch,
        systemPrompt,
        model,
      );

      batchInputTokens += evaluation.usage.inputTokens;
      batchOutputTokens += evaluation.usage.outputTokens;

      const resultByDocumentId = new Map(
        evaluation.results.map((item) => [item.documentId, item]),
      );
      const assignedDocumentIds = run.includeAlreadyAssigned
        ? await fetchTermAssignedDocumentIds({
            termId: run.termId,
            documentIds: llmBatch.map((doc) => doc.id),
          })
        : new Set<string>();

      if (run.includeAlreadyAssigned && assignedDocumentIds.size > 0) {
        const documentIdsToRemove = [...assignedDocumentIds].filter(
          (documentId) => {
            const result = resultByDocumentId.get(documentId);
            return (
              result !== undefined &&
              !passesBackfillThreshold(result, run.confidenceMin)
            );
          },
        );

        if (documentIdsToRemove.length > 0) {
          await db
            .delete(documentTerms)
            .where(
              and(
                eq(documentTerms.termId, run.termId),
                inArray(documentTerms.documentId, documentIdsToRemove),
              ),
            );

          const partitions = await fetchDigestPartitionsForDocuments(
            documentIdsToRemove,
          );

          await bulkInvalidateTermDigestPartitions({
            termId: run.termId,
            partitions,
          });

          batchUnmatched += documentIdsToRemove.length;

          for (const documentId of documentIdsToRemove) {
            affectedParentDocumentIds.add(documentId);
          }
        }
      }

      const matches = evaluation.results.filter((item) =>
        passesBackfillThreshold(item, run.confidenceMin),
      );

      const newMatches = matches.filter(
        (item) => !assignedDocumentIds.has(item.documentId),
      );

      if (newMatches.length > 0) {
        await db
          .insert(documentTerms)
          .values(
            newMatches.map((item) => ({
              documentId: item.documentId,
              termId: run.termId,
              confidence: item.confidence,
              assignedBy: DOCUMENT_TERM_ASSIGNED_BY.termBackfill,
            })),
          )
          .onConflictDoNothing();

        batchMatched += newMatches.length;

        for (const item of newMatches) {
          affectedParentDocumentIds.add(item.documentId);
        }
      }
    }

    for (const parentDocumentId of affectedParentDocumentIds) {
      await syncDiscussionDocumentTerms(parentDocumentId);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Term backfill batch failed.";
    await markRunFailed(runId, message);
    return;
  }

  const lastDocument = documents[documents.length - 1]!;
  const nextCursor = {
    publishedAt: lastDocument.publishedAt!.toISOString(),
    documentId: lastDocument.id,
  };

  const priorResult = run.result as TermBackfillRunProgress;
  const totalInputTokens = priorResult.inputTokens + batchInputTokens;
  const totalOutputTokens = priorResult.outputTokens + batchOutputTokens;
  const updatedResult: TermBackfillRunProgress = {
    documentsScanned: priorResult.documentsScanned + documents.length,
    documentsMatched: priorResult.documentsMatched + batchMatched,
    documentsUnmatched: (priorResult.documentsUnmatched ?? 0) + batchUnmatched,
    documentsSkipped: priorResult.documentsSkipped,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd: computeTokenCostUsd({
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model,
    }),
    cursor: nextCursor,
    cancelledAt: priorResult.cancelledAt,
  };

  const [updatedRun] = await db
    .update(termBackfillRuns)
    .set({ result: updatedResult })
    .where(eq(termBackfillRuns.id, runId))
    .returning();

  if (!updatedRun) {
    return;
  }

  if (
    updatedRun.status === "cancelled" ||
    updatedRun.status === "failed" ||
    updatedRun.status === "success"
  ) {
    return;
  }

  const userId = context.userId ?? updatedRun.triggeredBy ?? "system";
  await dispatchNextBatch(runId, userId, run.termId);
}
