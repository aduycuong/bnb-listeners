import { z } from "zod";

import { WORKFLOW_RUN_STATES } from "@/lib/admin-console/constants";
import { listWorkflowRuns } from "@/lib/admin-console/services/list-workflow-runs";
import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { WORKFLOW_NAMES } from "@/lib/workflows/constants";

const queryParamsSchema = z.object({
  workflow: z.enum(WORKFLOW_NAMES).optional(),
  state: z.enum(WORKFLOW_RUN_STATES).optional(),
  cursor: z.string().optional(),
  count: z.coerce.number().int().positive().max(100).optional(),
});

export const GET = createApiHandler({ queryParams: queryParamsSchema }, listWorkflowRuns, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
