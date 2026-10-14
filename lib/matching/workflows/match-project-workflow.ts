import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { z } from "zod";

import { triggerProjectEnrich } from "@/lib/enrichment/services/trigger-project-enrich";

import { MATCH_CONFIG } from "../config";
import { finalizeProjectMatch } from "../services/finalize-project-match";
import { judgeThreads } from "../services/judge-threads";
import { matchProjectLexical } from "../services/match-project-lexical";
import type { MatchProjectWorkflowPayload } from "../types";

export const matchProjectWorkflowPayloadSchema = z.object({
  projectId: z.uuid(),
  collectRunId: z.uuid().optional(),
});

/**
 * Match for one project (docs/decisions.md D11).
 *
 * 1. lexical: tier 1; certain mentions are written, threads needing tier 2 listed.
 *    An incremental run on a project whose config changed since its last full
 *    match runs a full match instead.
 * 2. judge-{n}: tier 2 for a few threads per step.
 * 3. finalize (full only): drop stale mentions and record the signature.
 * 4. enrich: start Enrich for the project's new or changed mentions.
 */
export const matchProjectWorkflow: RouteFunction<MatchProjectWorkflowPayload> = async (
  context,
) => {
  const { projectId } = context.requestPayload;
  let collectRunId = context.requestPayload.collectRunId;

  let lexical = await context.run("lexical", () =>
    matchProjectLexical({ projectId, collectRunId }),
  );

  if (collectRunId && lexical.storedSignature !== lexical.signature) {
    collectRunId = undefined;
    lexical = await context.run("lexical-full", () => matchProjectLexical({ projectId }));
  }

  const roots = lexical.pendingRootIds;
  for (let offset = 0; offset < roots.length; offset += MATCH_CONFIG.threadsPerStep) {
    await context.run(`judge-${offset}`, () =>
      judgeThreads({
        projectId,
        rootIds: roots.slice(offset, offset + MATCH_CONFIG.threadsPerStep),
        collectRunId,
      }),
    );
  }

  if (!collectRunId) {
    await context.run("finalize", () =>
      finalizeProjectMatch({ projectId, signature: lexical.signature }),
    );
  }

  await context.run("enrich", () =>
    triggerProjectEnrich({ projectId, runKey: context.workflowRunId.replace(/^wfr_/, "") }),
  );
};

export const matchProjectWorkflowOptions: WorkflowServeOptions<MatchProjectWorkflowPayload> = {
  schema: matchProjectWorkflowPayloadSchema,
  failureFunction: async ({ context, failResponse }) => {
    console.error("[workflow:match-project] failed", {
      workflowRunId: context.workflowRunId,
      projectId: context.requestPayload.projectId,
      failResponse,
    });
  },
};
