import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { runJob } from "@/lib/jobs/services/run-job";

const jobIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler({ parameters: jobIdSchema }, runJob, {
  allowedRoles: [],
  minWorkspacePermission: "edit",
});
