import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateJobBodySchema } from "@/lib/jobs/schema";
import { deleteJob } from "@/lib/jobs/services/delete-job";
import { getJob } from "@/lib/jobs/services/get-job";
import { updateJob } from "@/lib/jobs/services/update-job";

const jobIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler({ parameters: jobIdSchema }, getJob, {
  allowedRoles: [],
  minWorkspacePermission: "read",
});

export const PATCH = createApiHandler(
  { parameters: jobIdSchema, requestBody: updateJobBodySchema },
  updateJob,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler({ parameters: jobIdSchema }, deleteJob, {
  allowedRoles: [],
  minWorkspacePermission: "edit",
});
