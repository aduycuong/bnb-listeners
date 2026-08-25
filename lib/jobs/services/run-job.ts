import { and, eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { RunJobParams, RunJobResult } from "../types";
import { executeJob } from "./execute-job";

export async function runJob(
  params: RunJobParams,
  ctx: WorkspaceContext,
): Promise<RunJobResult> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(
      and(eq(jobs.id, params.id), eq(jobs.workspaceId, ctx.workspaceId)),
    )
    .limit(1);

  if (!job) {
    throw new NotFoundError("job", params.id);
  }

  const run = await executeJob({ job, userId: ctx.userId });

  return {
    id: run.id,
    status: run.status,
    result: run.result,
    error: run.error,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
