import { eq } from "drizzle-orm";
import { z } from "zod";

import { jobs } from "@/db/schema";
import { db } from "@/lib/db";
import { buildQstashCron } from "@/lib/qstash/utils/build-qstash-cron";
import type { QstashJobHandlerContext } from "@/lib/qstash/job-config";

import { executeJob } from "./execute-job";

const runScheduledJobPayloadSchema = z.object({
  jobId: z.uuid(),
});

export async function runScheduledJob(
  payload: unknown,
  context: QstashJobHandlerContext,
): Promise<void> {
  const { jobId } = runScheduledJobPayloadSchema.parse(payload);

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  if (!job || !job.enabled) {
    return;
  }

  const qstashCron = buildQstashCron(job.cronConfig);
  if (!qstashCron) {
    return;
  }

  const result = await executeJob({ job, userId: context.userId });

  if (result.status === "failed") {
    throw new Error(result.error ?? "Job failed");
  }
}
