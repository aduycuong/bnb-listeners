import { and, eq } from "drizzle-orm";

import { termBackfillRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  GetTermBackfillRunParams,
  GetTermBackfillRunResult,
} from "../types";
import { toTermBackfillRunItem } from "../utils/to-term-backfill-run-item";

export async function getTermBackfillRun(
  params: GetTermBackfillRunParams,
  ctx: WorkspaceContext,
): Promise<GetTermBackfillRunResult> {
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

  return { run: toTermBackfillRunItem(run) };
}
