import { eq } from "drizzle-orm";
import { z } from "zod";

import { termGroupMemberRebuildRuns, termGroups } from "@/db/schema";
import { db } from "@/lib/db";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";
import { parseChatModel, type ChatModelId } from "@/lib/langchain";
import { addJob } from "@/lib/qstash/services/add-job-service";
import {
  DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  TERM_GROUP_MEMBER_REBUILD_BATCH_SIZE,
  TERM_GROUP_MEMBER_REBUILD_LLM_BATCH_SIZE,
  TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME,
} from "@/lib/term-groups/term-group-member-rebuild-config";

import { applyTermGroupMemberEvaluations } from "../utils/apply-term-group-member-evaluations";
import { computeTokenCostUsd } from "../utils/estimate-rebuild-cost";
import { evaluateTermsForTermGroup } from "../utils/evaluate-terms-for-term-group";
import { filterTermsForRebuildEvaluation } from "../utils/filter-terms-for-rebuild-evaluation";
import { fetchRebuildTermBatch } from "../utils/fetch-rebuild-term-batch";
import { finalizeTermGroupMemberRebuildRun } from "./finalize-term-group-member-rebuild-run";

export const processTermGroupMemberRebuildBatchPayloadSchema = z.object({
  runId: z.uuid(),
});

async function markRunFailed(runId: string, error: string): Promise<void> {
  const [run] = await db
    .update(termGroupMemberRebuildRuns)
    .set({
      status: "failed",
      error,
      finishedAt: new Date(),
    })
    .where(eq(termGroupMemberRebuildRuns.id, runId))
    .returning();

  if (run) {
    await finalizeTermGroupMemberRebuildRun({ run, success: false });
  }
}

async function dispatchNextBatch(
  runId: string,
  userId: string,
  termGroupId: string,
) {
  await addJob({
    jobName: TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME,
    payload: { runId },
    userId,
    flowControl: {
      key: `term-group-member-rebuild-${termGroupId}`,
      parallelism: 1,
    },
  });
}

/**
 * QStash handler: process one batch of terms for a term group member rebuild run.
 */
export async function processTermGroupMemberRebuildBatch(
  payload: unknown,
  context: { userId?: string },
): Promise<void> {
  const parsed =
    processTermGroupMemberRebuildBatchPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      `[${TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME}] Invalid payload: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  const { runId } = parsed.data;

  const [run] = await db
    .select()
    .from(termGroupMemberRebuildRuns)
    .where(eq(termGroupMemberRebuildRuns.id, runId))
    .limit(1);

  if (!run) {
    console.warn(
      `[${TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME}] Run not found: ${runId}`,
    );
    return;
  }

  if (
    run.status === "cancelled" ||
    run.status === "success" ||
    run.status === "failed"
  ) {
    return;
  }

  if (run.status === "pending") {
    await db
      .update(termGroupMemberRebuildRuns)
      .set({ status: "running" })
      .where(eq(termGroupMemberRebuildRuns.id, runId));
  }

  const [group] = await db
    .select({
      id: termGroups.id,
      name: termGroups.name,
      description: termGroups.description,
      workspaceId: termGroups.workspaceId,
    })
    .from(termGroups)
    .where(eq(termGroups.id, run.termGroupId))
    .limit(1);

  if (!group) {
    await markRunFailed(runId, "Term group not found.");
    return;
  }

  const terms = await fetchRebuildTermBatch({
    workspaceId: run.workspaceId,
    limit: TERM_GROUP_MEMBER_REBUILD_BATCH_SIZE,
    cursor: run.result.cursor,
  });

  if (terms.length === 0) {
    const [completed] = await db
      .update(termGroupMemberRebuildRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        error: null,
      })
      .where(eq(termGroupMemberRebuildRuns.id, runId))
      .returning();

    if (completed) {
      await finalizeTermGroupMemberRebuildRun({ run: completed, success: true });
    }

    return;
  }

  const isLastBatch = terms.length < TERM_GROUP_MEMBER_REBUILD_BATCH_SIZE;
  const lastTerm = terms[terms.length - 1]!;
  const nextCursor = {
    createdAt: lastTerm.createdAt.toISOString(),
    termId: lastTerm.id,
  };

  const termsToEvaluate = await filterTermsForRebuildEvaluation({
    termGroupId: run.termGroupId,
    terms,
    includeAlreadyMembers: run.includeAlreadyMembers,
  });

  let batchInputTokens = 0;
  let batchOutputTokens = 0;
  let batchMatched = 0;
  let batchRemoved = 0;
  let batchWebQueries = 0;

  const model = parseChatModel(
    run.model,
    DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL,
  ) as ChatModelId;

  if (termsToEvaluate.length > 0) {
    const systemPrompt = await resolveWorkspaceSystemPrompt(
      group.workspaceId,
      "evaluate_term_group_membership",
    );

    try {
      for (
        let offset = 0;
        offset < termsToEvaluate.length;
        offset += TERM_GROUP_MEMBER_REBUILD_LLM_BATCH_SIZE
      ) {
        const llmBatch = termsToEvaluate.slice(
          offset,
          offset + TERM_GROUP_MEMBER_REBUILD_LLM_BATCH_SIZE,
        );
        const evaluation = await evaluateTermsForTermGroup(
          { name: group.name, description: group.description },
          llmBatch,
          systemPrompt,
          model,
          run.enableWebResearch,
        );

        batchInputTokens += evaluation.usage.inputTokens;
        batchOutputTokens += evaluation.usage.outputTokens;
        batchWebQueries += evaluation.webQueries;

        const applyResult = await applyTermGroupMemberEvaluations({
          workspaceId: run.workspaceId,
          termGroupId: run.termGroupId,
          evaluations: evaluation.results,
          confidenceMin: run.confidenceMin,
          removeNonMatching: run.removeNonMatching,
        });

        batchMatched += applyResult.matched;
        batchRemoved += applyResult.removed;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Term group member rebuild batch failed.";
      await markRunFailed(runId, message);
      return;
    }
  }

  const totalInputTokens = run.result.inputTokens + batchInputTokens;
  const totalOutputTokens = run.result.outputTokens + batchOutputTokens;
  const updatedResult = {
    termsScanned: run.result.termsScanned + termsToEvaluate.length,
    termsMatched: run.result.termsMatched + batchMatched,
    termsRemoved: run.result.termsRemoved + batchRemoved,
    webQueries: run.result.webQueries + batchWebQueries,
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

  if (isLastBatch) {
    const [completed] = await db
      .update(termGroupMemberRebuildRuns)
      .set({
        result: updatedResult,
        status: "success",
        finishedAt: new Date(),
        error: null,
      })
      .where(eq(termGroupMemberRebuildRuns.id, runId))
      .returning();

    if (completed) {
      await finalizeTermGroupMemberRebuildRun({ run: completed, success: true });
    }

    return;
  }

  const [updatedRun] = await db
    .update(termGroupMemberRebuildRuns)
    .set({ result: updatedResult })
    .where(eq(termGroupMemberRebuildRuns.id, runId))
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
  await dispatchNextBatch(runId, userId, run.termGroupId);
}
