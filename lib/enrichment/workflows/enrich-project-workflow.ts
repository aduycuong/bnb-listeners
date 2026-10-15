import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { triggerProjectTopics } from "@/lib/topics/services/trigger-project-topics";

import { ENRICH_CONFIG } from "../config";
import { enrichThreads } from "../services/enrich-threads";
import { planProjectEnrich } from "../services/plan-project-enrich";
import type { EnrichProjectWorkflowPayload } from "../types";

export const enrichProjectWorkflowPayloadSchema = z.object({ projectId: z.uuid() });

/**
 * Enrich for one project (docs/decisions.md D14).
 *
 * 1. plan: threads with relevant mentions that are new, changed or enriched
 *    under another signature; irrelevant mentions are marked skipped.
 * 2. enrich-{n}: a few threads per step, one model call per thread.
 * 3. topics: start the topic stage for the new or changed hints (D15).
 */
export const enrichProjectWorkflow: RouteFunction<EnrichProjectWorkflowPayload> = async (
  context,
) => {
  const { projectId } = context.requestPayload;
  const plan = await context.run("plan", () => planProjectEnrich({ projectId }));

  for (let offset = 0; offset < plan.rootIds.length; offset += ENRICH_CONFIG.threadsPerStep) {
    await context.run(`enrich-${offset}`, () =>
      enrichThreads({
        projectId,
        rootIds: plan.rootIds.slice(offset, offset + ENRICH_CONFIG.threadsPerStep),
      }),
    );
  }

  await context.run("topics", () =>
    triggerProjectTopics({ projectId, runKey: context.workflowRunId.replace(/^wfr_/, "") }),
  );
};

export const enrichProjectWorkflowOptions: WorkflowServeOptions<EnrichProjectWorkflowPayload> = {
  schema: enrichProjectWorkflowPayloadSchema,
  failureFunction: async ({ context, failResponse }) => {
    console.error("[workflow:enrich-project] failed", {
      workflowRunId: context.workflowRunId,
      projectId: context.requestPayload.projectId,
      failResponse,
    });
  },
};
