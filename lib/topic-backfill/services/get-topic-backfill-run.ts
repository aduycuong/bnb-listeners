import { and, eq } from "drizzle-orm";

import { topicBackfillRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  GetTopicBackfillRunParams,
  GetTopicBackfillRunResult,
} from "../types";
import { toTopicBackfillRunItem } from "../utils/to-topic-backfill-run-item";

export async function getTopicBackfillRun(
  params: GetTopicBackfillRunParams,
  ctx: WorkspaceContext,
): Promise<GetTopicBackfillRunResult> {
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

  return { run: toTopicBackfillRunItem(run) };
}
