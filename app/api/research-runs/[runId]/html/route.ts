import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { rebuildResearchHtml } from "@/lib/research/services/rebuild-research-html";

const researchRunIdSchema = z.object({
  runId: z.uuid(),
});

export const POST = createApiHandler(
  { parameters: researchRunIdSchema },
  rebuildResearchHtml,
  {
    allowedRoles: [],
    minWorkspacePermission: "edit",
  },
);
