import { and, eq } from "drizzle-orm";

import { termBackfillRuns } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  CancelTermBackfillRunParams,
  CancelTermBackfillRunResult,
} from "../types";
import { toTermBackfillRunItem } from "../utils/to-term-backfill-run-item";
import { finalizeTermBackfillRun } from "./finalize-term-backfill-run";

export async function cancelTermBackfillRun(
  params: CancelTermBackfillRunParams,
  ctx: WorkspaceContext,
): Promise<CancelTermBackfillRunResult> {
  const [run] = await db
    .select()
    .from(termBackfillRuns)
    .where(
      and(
        eq(termBackfillRuns.id, params.runId),
        eq(termBackfillRuns.termId, params.id),
        eq(termBackfillRuns.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!run) {
    throw new NotFoundError("term_backfill_run", params.runId);
  }

  if (run.status !== "pending" && run.status !== "running") {
    throw new UnknownServiceError("This backfill run is no longer active.");
  }

  const cancelledAt = new Date().toISOString();

  const [updated] = await db
    .update(termBackfillRuns)
    .set({
      status: "cancelled",
      finishedAt: new Date(),
      result: {
        ...run.result,
        cancelledAt,
      },
    })
    .where(eq(termBackfillRuns.id, run.id))
    .returning();

  if (!updated) {
    throw new UnknownServiceError("Failed to cancel backfill run.");
  }

  await finalizeTermBackfillRun({ run: updated, success: false });

  return { run: toTermBackfillRunItem(updated) };
}
