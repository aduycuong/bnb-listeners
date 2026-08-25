import { and, eq, ne } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { DuplicateError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { SchedulableJobType } from "@/lib/jobs/constants";
import { parseJobParams } from "@/lib/jobs/handlers/registry";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { UpdateJobParams, UpdateJobResult } from "../types";
import { syncJobSchedule } from "./sync-job-schedule";

export async function updateJob(
  params: UpdateJobParams,
  ctx: WorkspaceContext,
): Promise<UpdateJobResult> {
  const { id, ...updates } = params;

  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.workspaceId, ctx.workspaceId)))
    .limit(1);

  if (!existingJob) {
    throw new NotFoundError("job", id);
  }

  if (updates.name) {
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.workspaceId, ctx.workspaceId),
          eq(jobs.name, updates.name),
          ne(jobs.id, id),
        ),
      )
      .limit(1);

    if (existing) {
      throw new DuplicateError("job", existing.id, "with this name");
    }
  }

  const effectiveJobType = (updates.jobType ??
    existingJob.jobType) as SchedulableJobType;

  if (updates.params !== undefined) {
    updates.params = parseJobParams(effectiveJobType, updates.params);
  }

  const [job] = await db
    .update(jobs)
    .set(updates)
    .where(and(eq(jobs.id, id), eq(jobs.workspaceId, ctx.workspaceId)))
    .returning();

  if (!job) {
    throw new NotFoundError("job", id);
  }

  await syncJobSchedule({ jobId: job.id, userId: ctx.userId });

  return job;
}
