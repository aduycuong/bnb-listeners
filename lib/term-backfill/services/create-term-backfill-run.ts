import { eq } from "drizzle-orm";

import { termBackfillRuns, terms } from "@/db/schema";
import {
  CreateFailedError,
  UnknownServiceError,
} from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { addJob } from "@/lib/qstash/services/add-job-service";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  DEFAULT_TERM_BACKFILL_MODEL,
  TERM_BACKFILL_CONFIDENCE_MIN,
  TERM_BACKFILL_QSTASH_JOB_NAME,
} from "@/lib/terms/term-backfill-config";
import type {
  CreateTermBackfillRunParams,
  CreateTermBackfillRunResult,
} from "../types";
import {
  assertValidBackfillListeningDate,
  loadTermBackfillContext,
} from "../utils/load-term-backfill-context";
import { toTermBackfillRunItem } from "../utils/to-term-backfill-run-item";
import { estimateTermBackfill } from "./estimate-term-backfill";

export async function createTermBackfillRun(
  params: CreateTermBackfillRunParams,
  ctx: WorkspaceContext,
): Promise<CreateTermBackfillRunResult> {
  const term = await loadTermBackfillContext(params.id, ctx.workspaceId);

  if (term.activeBackfillRunId) {
    throw new UnknownServiceError(
      "A backfill job is already running for this term.",
    );
  }

  const estimateResult = await estimateTermBackfill(params, ctx);
  const newListeningStartedAt = new Date(estimateResult.newListeningStartedAt);
  assertValidBackfillListeningDate(newListeningStartedAt, term.createdAt);

  const [run] = await db
    .insert(termBackfillRuns)
    .values({
      workspaceId: ctx.workspaceId,
      termId: term.id,
      status: "pending",
      newListeningStartedAt,
      scanEndAt: term.createdAt,
      model: estimateResult.model ?? DEFAULT_TERM_BACKFILL_MODEL,
      qualityMin: estimateResult.qualityMin,
      includeAlreadyAssigned: estimateResult.includeAlreadyAssigned,
      confidenceMin: TERM_BACKFILL_CONFIDENCE_MIN,
      estimate: estimateResult.estimate,
      triggeredBy: ctx.userId,
    })
    .returning();

  if (!run) {
    throw new CreateFailedError("term_backfill_run");
  }

  await db
    .update(terms)
    .set({ activeBackfillRunId: run.id })
    .where(eq(terms.id, term.id));

  await addJob({
    jobName: TERM_BACKFILL_QSTASH_JOB_NAME,
    payload: { runId: run.id },
    userId: ctx.userId,
    flowControl: {
      key: `term-backfill-${term.id}`,
      parallelism: 1,
    },
  });

  return { run: toTermBackfillRunItem(run) };
}
