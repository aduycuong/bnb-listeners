import { and, eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetJobParams, GetJobResult } from "../types";

export async function getJob(
  params: GetJobParams,
  ctx: WorkspaceContext,
): Promise<GetJobResult> {
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

  return job;
}
