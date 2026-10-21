import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { triggerProjectTopics } from "@/lib/topics/services/trigger-project-topics";

import { ENRICH_CONFIG } from "../config";
import { ENRICHER_KEYS, type EnricherKey } from "../registry";
import { enrichThreads } from "../services/enrich-threads";
import { indexTerms } from "../services/index-terms";
import { loadEnrichContext } from "../services/load-enrich-context";
import { planProjectEnrich } from "../services/plan-project-enrich";
import { resetStageEnrichments } from "../services/reset-stage-enrichments";
import type { EnrichProjectWorkflowPayload } from "../types";
import { selectStageEnrichers } from "../utils/pending-enrichments-sql";

export const enrichProjectWorkflowPayloadSchema = z.object({
  projectId: z.uuid(),
  only: z.array(z.enum(ENRICHER_KEYS as [EnricherKey, ...EnricherKey[]])).optional(),
  force: z.boolean().optional(),
});

/** Stages whose state is reset first and that run after the LLM pass, for this payload. */
async function planStages(payload: EnrichProjectWorkflowPayload) {
  const ctx = await loadEnrichContext({ projectId: payload.projectId });
  const stages = selectStageEnrichers(ctx, payload);
  if (payload.force) {
    for (const key of stages) await resetStageEnrichments({ projectId: payload.projectId, key });
  }
  return stages;
}

/**
 * Enrich for one project (docs/decisions.md D14, D18).
 *
 * 1. plan: `(mention, enricher)` pairs that are new, failed, changed or run
 *    under another signature; `only` limits the enrichers, `force` ignores
 *    the state.
 * 2. enrich-{n}: a few threads per step, one model call per thread for the
 *    union of the pending enrichers.
 * 3. stages: `terms_index` in steps of `termsPerStep`; grouping stages
 *    (`topic_assign`, `question_assign`) as the topic workflow (D15).
 */
export const enrichProjectWorkflow: RouteFunction<EnrichProjectWorkflowPayload> = async (context) => {
  const payload = context.requestPayload;
  const { projectId } = payload;
  const plan = await context.run("plan", () => planProjectEnrich(payload));

  for (let offset = 0; offset < plan.rootIds.length; offset += ENRICH_CONFIG.threadsPerStep) {
    await context.run(`enrich-${offset}`, () =>
      enrichThreads({
        ...payload,
        rootIds: plan.rootIds.slice(offset, offset + ENRICH_CONFIG.threadsPerStep),
      }),
    );
  }

  const stages = await context.run("stages", () => planStages(payload));

  if (stages.includes("terms_index")) {
    for (let step = 0; ; step += 1) {
      const result = await context.run(`terms-${step}`, () => indexTerms({ projectId }));
      if (!result.more) break;
    }
  }

  if (stages.includes("topic_assign")) {
    await context.run("topics", () =>
      triggerProjectTopics({
        projectId,
        kind: "topic",
        runKey: context.workflowRunId.replace(/^wfr_/, ""),
      }),
    );
  }

  if (stages.includes("question_assign")) {
    await context.run("questions", () =>
      triggerProjectTopics({
        projectId,
        kind: "buyer_question",
        runKey: context.workflowRunId.replace(/^wfr_/, ""),
      }),
    );
  }
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
