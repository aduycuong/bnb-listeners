import { eq } from "drizzle-orm";
import { z } from "zod";

import { documentTopics, topicBackfillRuns, topics } from "@/db/schema";
import { evaluateDocumentsForTopic } from "@/lib/classification/utils/evaluate-documents-for-topic";
import { DOCUMENT_TOPIC_ASSIGNED_BY } from "@/lib/document-topics/document-topic-config";
import { db } from "@/lib/db";
import { buildEvaluateTopicPrompt } from "@/lib/llm/utils/build-system-prompt-from-settings";
import { parseChatModel, type ChatModelId } from "@/lib/langchain";
import { addJob } from "@/lib/qstash/services/add-job-service";
import { getWorkspaceLlmSettings } from "@/lib/workspaces/services/get-workspace-llm-settings";

import {
  DEFAULT_TOPIC_BACKFILL_MODEL,
  TOPIC_BACKFILL_BATCH_SIZE,
  TOPIC_BACKFILL_LLM_BATCH_SIZE,
  TOPIC_BACKFILL_QSTASH_JOB_NAME,
} from "@/lib/topics/topic-backfill-config";
import { fetchBackfillDocumentBatch } from "../utils/fetch-backfill-document-batch";
import { computeTokenCostUsd } from "../utils/estimate-backfill-cost";
import { finalizeTopicBackfillRun } from "./finalize-topic-backfill-run";

export const processTopicBackfillBatchPayloadSchema = z.object({
  runId: z.uuid(),
});

async function markRunFailed(runId: string, error: string): Promise<void> {
  const [run] = await db
    .update(topicBackfillRuns)
    .set({
      status: "failed",
      error,
      finishedAt: new Date(),
    })
    .where(eq(topicBackfillRuns.id, runId))
    .returning();

  if (run) {
    await finalizeTopicBackfillRun({ run, success: false });
  }
}

async function dispatchNextBatch(runId: string, userId: string, topicId: string) {
  await addJob({
    jobName: TOPIC_BACKFILL_QSTASH_JOB_NAME,
    payload: { runId },
    userId,
    flowControl: {
      key: `topic-backfill-${topicId}`,
      parallelism: 1,
    },
  });
}

/**
 * QStash handler: process one batch of documents for a topic backfill run.
 */
export async function processTopicBackfillBatch(
  payload: unknown,
  context: { userId?: string },
): Promise<void> {
  const parsed = processTopicBackfillBatchPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[${TOPIC_BACKFILL_QSTASH_JOB_NAME}] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  const { runId } = parsed.data;

  const [run] = await db
    .select()
    .from(topicBackfillRuns)
    .where(eq(topicBackfillRuns.id, runId))
    .limit(1);

  if (!run) {
    console.warn(`[${TOPIC_BACKFILL_QSTASH_JOB_NAME}] Run not found: ${runId}`);
    return;
  }

  if (run.status === "cancelled" || run.status === "success" || run.status === "failed") {
    return;
  }

  if (run.status === "pending") {
    await db
      .update(topicBackfillRuns)
      .set({ status: "running" })
      .where(eq(topicBackfillRuns.id, runId));
  }

  const [topic] = await db
    .select({
      id: topics.id,
      name: topics.name,
      description: topics.description,
      workspaceId: topics.workspaceId,
    })
    .from(topics)
    .where(eq(topics.id, run.topicId))
    .limit(1);

  if (!topic) {
    await markRunFailed(runId, "Topic not found.");
    return;
  }

  const scanContext = {
    workspaceId: run.workspaceId,
    topicId: run.topicId,
    newListeningStartedAt: run.newListeningStartedAt,
    scanEndAt: run.scanEndAt,
    qualityMin: run.qualityMin,
    includeAlreadyAssigned: run.includeAlreadyAssigned,
  };

  const documents = await fetchBackfillDocumentBatch({
    context: scanContext,
    limit: TOPIC_BACKFILL_BATCH_SIZE,
    cursor: run.result.cursor,
  });

  if (documents.length === 0) {
    const [completed] = await db
      .update(topicBackfillRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        error: null,
      })
      .where(eq(topicBackfillRuns.id, runId))
      .returning();

    if (completed) {
      await finalizeTopicBackfillRun({ run: completed, success: true });
    }

    return;
  }

  const llmSettings = await getWorkspaceLlmSettings(topic.workspaceId);
  const systemPrompt = buildEvaluateTopicPrompt(llmSettings, {
    name: topic.name,
    description: topic.description,
  });
  const model = parseChatModel(run.model, DEFAULT_TOPIC_BACKFILL_MODEL) as ChatModelId;

  let batchInputTokens = 0;
  let batchOutputTokens = 0;
  let batchMatched = 0;

  try {
    for (
      let offset = 0;
      offset < documents.length;
      offset += TOPIC_BACKFILL_LLM_BATCH_SIZE
    ) {
      const llmBatch = documents.slice(offset, offset + TOPIC_BACKFILL_LLM_BATCH_SIZE);
      const evaluation = await evaluateDocumentsForTopic(
        { name: topic.name, description: topic.description },
        llmBatch,
        systemPrompt,
        model,
      );

      batchInputTokens += evaluation.usage.inputTokens;
      batchOutputTokens += evaluation.usage.outputTokens;

      const matches = evaluation.results.filter(
        (item) => item.match && item.confidence >= run.confidenceMin,
      );

      if (matches.length > 0) {
        await db
          .insert(documentTopics)
          .values(
            matches.map((item) => ({
              documentId: item.documentId,
              topicId: run.topicId,
              confidence: item.confidence,
              assignedBy: DOCUMENT_TOPIC_ASSIGNED_BY.topicBackfill,
            })),
          )
          .onConflictDoNothing();

        batchMatched += matches.length;
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Topic backfill batch failed.";
    await markRunFailed(runId, message);
    return;
  }

  const lastDocument = documents[documents.length - 1]!;
  const nextCursor = {
    publishedAt: lastDocument.publishedAt!.toISOString(),
    documentId: lastDocument.id,
  };

  const totalInputTokens = run.result.inputTokens + batchInputTokens;
  const totalOutputTokens = run.result.outputTokens + batchOutputTokens;
  const updatedResult = {
    documentsScanned: run.result.documentsScanned + documents.length,
    documentsMatched: run.result.documentsMatched + batchMatched,
    documentsSkipped: run.result.documentsSkipped,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd: computeTokenCostUsd({
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      model,
    }),
    cursor: nextCursor,
    cancelledAt: run.result.cancelledAt,
  };

  const [updatedRun] = await db
    .update(topicBackfillRuns)
    .set({ result: updatedResult })
    .where(eq(topicBackfillRuns.id, runId))
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
  await dispatchNextBatch(runId, userId, run.topicId);
}
