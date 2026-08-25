import { eq } from "drizzle-orm";

import { jobRuns, type Job } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { isSchedulableJobType } from "@/lib/jobs/constants";
import { getJobHandler, parseJobParams } from "@/lib/jobs/handlers/registry";

export type ExecuteJobParams = {
  job: Job;
  userId?: string;
};

export type ExecuteJobResult = {
  id: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export async function executeJob(
  params: ExecuteJobParams,
): Promise<ExecuteJobResult> {
  const { job, userId } = params;

  if (!isSchedulableJobType(job.jobType)) {
    throw new Error(`No job handler registered for job type: ${job.jobType}`);
  }

  const handler = getJobHandler(job.jobType);

  const [run] = await db
    .insert(jobRuns)
    .values({ jobId: job.id, status: "running" })
    .returning();

  if (!run) {
    throw new CreateFailedError("job run");
  }

  try {
    const parsedParams = parseJobParams(job.jobType, job.params);
    await handler.execute(parsedParams, {
      userId,
      jobId: job.id,
      jobRunId: run.id,
    });

    if (handler.completesAsynchronously) {
      return {
        id: run.id,
        status: "running",
        result: run.result ?? null,
        error: null,
        startedAt: run.startedAt,
        finishedAt: null,
      };
    }

    const finishedAt = new Date();
    await db
      .update(jobRuns)
      .set({
        status: "success",
        finishedAt,
      })
      .where(eq(jobRuns.id, run.id));

    return {
      id: run.id,
      status: "success",
      result: run.result ?? null,
      error: null,
      startedAt: run.startedAt,
      finishedAt,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    const finishedAt = new Date();

    await db
      .update(jobRuns)
      .set({
        status: "failed",
        error: message,
        finishedAt,
      })
      .where(eq(jobRuns.id, run.id));

    return {
      id: run.id,
      status: "failed",
      result: run.result ?? null,
      error: message,
      startedAt: run.startedAt,
      finishedAt,
    };
  }
}
