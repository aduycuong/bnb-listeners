import { and, desc, eq } from "drizzle-orm";

import { jobRuns, jobs } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListJobRunsParams, ListJobRunsResult } from "../types";

const DEFAULT_LIMIT = 20;

export async function listJobRuns(
  params: ListJobRunsParams,
  ctx: WorkspaceContext,
): Promise<ListJobRunsResult> {
  const [job] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(eq(jobs.id, params.id), eq(jobs.workspaceId, ctx.workspaceId)),
    )
    .limit(1);

  if (!job) {
    throw new NotFoundError("job", params.id);
  }

  const rows = await db
    .select({
      id: jobRuns.id,
      status: jobRuns.status,
      result: jobRuns.result,
      error: jobRuns.error,
      startedAt: jobRuns.startedAt,
      finishedAt: jobRuns.finishedAt,
    })
    .from(jobRuns)
    .where(eq(jobRuns.jobId, params.id))
    .orderBy(desc(jobRuns.startedAt))
    .limit(DEFAULT_LIMIT);

  return {
    items: rows.map((row) => ({
      ...row,
      result: row.result ?? null,
      error: row.error ?? null,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    })),
  };
}
