import { z } from "zod";

import { listWorkflowRuns } from "@/lib/admin-console/services/list-workflow-runs";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const queryParamsSchema = z.object({
  workflow: z.enum(["schedule-collections", "collect-source"]),
  cursor: z.string().optional(),
  count: z.coerce.number().int().positive().max(100).optional(),
});

export const GET = createApiHandler({ queryParams: queryParamsSchema }, listWorkflowRuns, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
