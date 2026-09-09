import { eq } from "drizzle-orm";

import { topicBackfillRuns, topics } from "@/db/schema";
import {
  CreateFailedError,
  UnknownServiceError,
} from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { addJob } from "@/lib/qstash/services/add-job-service";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  DEFAULT_TOPIC_BACKFILL_MODEL,
  TOPIC_BACKFILL_CONFIDENCE_MIN,
  TOPIC_BACKFILL_QSTASH_JOB_NAME,
} from "@/lib/topics/topic-backfill-config";
import type {
  CreateTopicBackfillRunParams,
  CreateTopicBackfillRunResult,
} from "../types";
import {
  assertValidBackfillListeningDate,
  loadTopicBackfillContext,
} from "../utils/load-topic-backfill-context";
import { toTopicBackfillRunItem } from "../utils/to-topic-backfill-run-item";
import { estimateTopicBackfill } from "./estimate-topic-backfill";

export async function createTopicBackfillRun(
  params: CreateTopicBackfillRunParams,
  ctx: WorkspaceContext,
): Promise<CreateTopicBackfillRunResult> {
  const topic = await loadTopicBackfillContext(params.id, ctx.workspaceId);

  if (topic.activeBackfillRunId) {
    throw new UnknownServiceError(
      "A backfill job is already running for this topic.",
    );
  }

  const estimateResult = await estimateTopicBackfill(params, ctx);
  const newListeningStartedAt = new Date(estimateResult.newListeningStartedAt);
  assertValidBackfillListeningDate(newListeningStartedAt, topic.createdAt);

  const [run] = await db
    .insert(topicBackfillRuns)
    .values({
      workspaceId: ctx.workspaceId,
      topicId: topic.id,
      status: "pending",
      newListeningStartedAt,
      scanEndAt: topic.createdAt,
      model: estimateResult.model ?? DEFAULT_TOPIC_BACKFILL_MODEL,
      qualityMin: estimateResult.qualityMin,
      includeAlreadyAssigned: estimateResult.includeAlreadyAssigned,
      confidenceMin: TOPIC_BACKFILL_CONFIDENCE_MIN,
      estimate: estimateResult.estimate,
      triggeredBy: ctx.userId,
    })
    .returning();

  if (!run) {
    throw new CreateFailedError("topic_backfill_run");
  }

  await db
    .update(topics)
    .set({ activeBackfillRunId: run.id })
    .where(eq(topics.id, topic.id));

  await addJob({
    jobName: TOPIC_BACKFILL_QSTASH_JOB_NAME,
    payload: { runId: run.id },
    userId: ctx.userId,
    flowControl: {
      key: `topic-backfill-${topic.id}`,
      parallelism: 1,
    },
  });

  return { run: toTopicBackfillRunItem(run) };
}
