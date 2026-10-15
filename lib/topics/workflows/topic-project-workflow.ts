import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { assignTopics } from "../services/assign-topics";
import { embedTopicHints } from "../services/embed-topic-hints";
import { mergeSimilarTopics } from "../services/merge-similar-topics";
import { refreshTopicStats } from "../services/refresh-topic-stats";
import type { TopicProjectWorkflowPayload } from "../types";

export const topicProjectWorkflowPayloadSchema = z.object({ projectId: z.uuid() });

/** Upper bounds on steps per run; the next run continues. */
const MAX_EMBED_STEPS = 20;
const MAX_ASSIGN_STEPS = 10;

/**
 * Topic stage for one project (docs/decisions.md D15).
 *
 * 1. embed-{n}: embed new or changed `topic_hint`s; a changed hint waits to be assigned again.
 * 2. assign-{n}: one model call puts waiting hints into existing or new topics.
 * 3. refresh: centroids and counts.
 * 4. merge: close topics the model calls the same are merged.
 * Steps 3–4 run only when something changed.
 */
export const topicProjectWorkflow: RouteFunction<TopicProjectWorkflowPayload> = async (context) => {
  const { projectId } = context.requestPayload;

  let embedded = 0;
  for (let step = 0; step < MAX_EMBED_STEPS; step += 1) {
    const result = await context.run(`embed-${step}`, () => embedTopicHints({ projectId }));
    embedded += result.embedded;
    if (!result.more) break;
  }

  let assigned = 0;
  for (let step = 0; step < MAX_ASSIGN_STEPS; step += 1) {
    const result = await context.run(`assign-${step}`, () => assignTopics({ projectId }));
    assigned += result.assigned;
    if (!result.more) break;
  }
  if (embedded === 0 && assigned === 0) return;

  await context.run("refresh", () => refreshTopicStats({ projectId }));
  const merged = await context.run("merge", () => mergeSimilarTopics({ projectId }));
  if (merged.merged.length > 0) {
    await context.run("refresh-merged", () => refreshTopicStats({ projectId }));
  }
};

export const topicProjectWorkflowOptions: WorkflowServeOptions<TopicProjectWorkflowPayload> = {
  schema: topicProjectWorkflowPayloadSchema,
  failureFunction: async ({ context, failResponse }) => {
    console.error("[workflow:topic-project] failed", {
      workflowRunId: context.workflowRunId,
      projectId: context.requestPayload.projectId,
      failResponse,
    });
  },
};
