import { and, eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { deleteSchedule } from "@/lib/qstash/services/delete-schedule-service";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteJobParams, DeleteJobResult } from "../types";
import { getJobScheduleId } from "../utils/get-job-schedule-id";

export async function deleteJob(
  params: DeleteJobParams,
  ctx: WorkspaceContext,
): Promise<DeleteJobResult> {
  const [job] = await db
    .delete(jobs)
    .where(
      and(eq(jobs.id, params.id), eq(jobs.workspaceId, ctx.workspaceId)),
    )
    .returning({ id: jobs.id });

  if (!job) {
    throw new NotFoundError("job", params.id);
  }

  await deleteSchedule({ scheduleId: getJobScheduleId(params.id) });

  return {
    id: job.id,
    message: "Job deleted.",
  };
}
