import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { deleteResearchRun } from "@/lib/research/services/delete-research-run";
import { getResearchRunDetail } from "@/lib/research/services/get-research-run-detail";

const researchRunIdSchema = z.object({
  runId: z.uuid(),
});

export const GET = createApiHandler(
  { parameters: researchRunIdSchema },
  getResearchRunDetail,
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const DELETE = createApiHandler(
  { parameters: researchRunIdSchema },
  deleteResearchRun,
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);
