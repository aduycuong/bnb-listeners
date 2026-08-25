import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { schedulableJobTypeSchema } from "@/lib/jobs/schema";
import { createJobBodySchema } from "@/lib/jobs/schema";
import { createJob } from "@/lib/jobs/services/create-job";
import { listJobs } from "@/lib/jobs/services/list-jobs";

const listJobsQuerySchema = z.object({
  jobType: schedulableJobTypeSchema.optional(),
});

export const GET = createApiHandler(
  { queryParams: listJobsQuerySchema },
  (params, ctx) => listJobs({ jobType: params.jobType }, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createJobBodySchema },
  createJob,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
