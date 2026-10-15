import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { assignMentionsToTopics } from "../services/assign-mentions-to-topics";
import { discoverTopics } from "../services/discover-topics";
import { embedTopicHints } from "../services/embed-topic-hints";
import { mergeSimilarTopics } from "../services/merge-similar-topics";
import { refreshTopicStats } from "../services/refresh-topic-stats";
import type { TopicProjectWorkflowPayload } from "../types";

export const topicProjectWorkflowPayloadSchema = z.object({ projectId: z.uuid() });

/** Upper bound on embed steps per run; the next run continues. */
const MAX_EMBED_STEPS = 20;

/**
 * Topic stage for one project (docs/decisions.md D15).
 *
 * 1. embed-{n}: embed new or changed `topic_hint`s.
 * 2. assign: mentions join the nearest topic when similar enough.
 * 3. discover: dense clusters of waiting mentions become named topics; assign again.
 * 4. merge: close topics the model calls the same are merged.
 * 5. refresh: centroids and counts.
 * Steps 3–5 run only when something changed.
 */
export const topicProjectWorkflow: RouteFunction<TopicProjectWorkflowPayload> = async (context) => {
  const { projectId } = context.requestPayload;

  let embedded = 0;
  for (let step = 0; step < MAX_EMBED_STEPS; step += 1) {
    const result = await context.run(`embed-${step}`, () => embedTopicHints({ projectId }));
    embedded += result.embedded;
    if (!result.more) break;
  }

  const assigned = await context.run("assign", () => assignMentionsToTopics({ projectId }));
  if (embedded === 0 && assigned.assigned === 0 && assigned.newlyWaiting === 0) return;

  const discovered = await context.run("discover", () => discoverTopics({ projectId }));
  if (discovered.created.length > 0) {
    await context.run("assign-new", () => assignMentionsToTopics({ projectId }));
  }
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
