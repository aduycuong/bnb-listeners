import { and, eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import {
  CreateFailedError,
  DuplicateError,
} from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { parseJobParams } from "@/lib/jobs/handlers/registry";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { CreateJobParams, CreateJobResult } from "../types";
import { syncJobSchedule } from "./sync-job-schedule";

export async function createJob(
  params: CreateJobParams,
  ctx: WorkspaceContext,
): Promise<CreateJobResult> {
  const parsedParams = parseJobParams(params.jobType, params.params);
  const [existing] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.workspaceId, ctx.workspaceId),
        eq(jobs.name, params.name),
      ),
    )
    .limit(1);

  if (existing) {
    throw new DuplicateError("job", existing.id, "with this name");
  }

  const [job] = await db
    .insert(jobs)
    .values({
      workspaceId: ctx.workspaceId,
      name: params.name,
      jobType: params.jobType,
      cronConfig: params.cronConfig,
      enabled: params.enabled,
      params: parsedParams,
    })
    .returning();

  if (!job) {
    throw new CreateFailedError("job");
  }

  await syncJobSchedule({ jobId: job.id, userId: ctx.userId });

  return job;
}
