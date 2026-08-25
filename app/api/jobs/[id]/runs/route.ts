import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listJobRuns } from "@/lib/jobs/services/list-job-runs";

const jobIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler({ parameters: jobIdSchema }, listJobRuns, {
  allowedRoles: [],
  minWorkspacePermission: "read",
});
