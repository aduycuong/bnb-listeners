import { z } from "zod";

import { JOB_RUN_STATES } from "@/lib/admin-console/constants";
import { listJobRuns } from "@/lib/admin-console/services/list-job-runs";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const queryParamsSchema = z.object({
  state: z.enum(JOB_RUN_STATES).optional(),
  cursor: z.string().optional(),
});

export const GET = createApiHandler({ queryParams: queryParamsSchema }, listJobRuns, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
