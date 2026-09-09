import { and, eq } from "drizzle-orm";

import { topicBackfillRuns } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  CancelTopicBackfillRunParams,
  CancelTopicBackfillRunResult,
} from "../types";
import { toTopicBackfillRunItem } from "../utils/to-topic-backfill-run-item";
import { finalizeTopicBackfillRun } from "./finalize-topic-backfill-run";

export async function cancelTopicBackfillRun(
  params: CancelTopicBackfillRunParams,
  ctx: WorkspaceContext,
): Promise<CancelTopicBackfillRunResult> {
  const [run] = await db
    .select()
    .from(topicBackfillRuns)
    .where(
      and(
        eq(topicBackfillRuns.id, params.runId),
        eq(topicBackfillRuns.topicId, params.id),
        eq(topicBackfillRuns.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!run) {
    throw new NotFoundError("topic_backfill_run", params.runId);
  }

  if (run.status !== "pending" && run.status !== "running") {
    throw new UnknownServiceError("This backfill run is no longer active.");
  }

  const cancelledAt = new Date().toISOString();

  const [updated] = await db
    .update(topicBackfillRuns)
    .set({
      status: "cancelled",
      finishedAt: new Date(),
      result: {
        ...run.result,
        cancelledAt,
      },
    })
    .where(eq(topicBackfillRuns.id, run.id))
    .returning();

  if (!updated) {
    throw new UnknownServiceError("Failed to cancel backfill run.");
  }

  await finalizeTopicBackfillRun({ run: updated, success: false });

  return { run: toTopicBackfillRunItem(updated) };
}
