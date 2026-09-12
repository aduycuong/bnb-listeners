import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termGroupMemberRebuildEstimateBodySchema } from "@/lib/term-group-member-rebuild/schema";
import { estimateTermGroupMemberRebuild } from "@/lib/term-group-member-rebuild/services/estimate-term-group-member-rebuild";

const termGroupIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  {
    parameters: termGroupIdSchema,
    requestBody: termGroupMemberRebuildEstimateBodySchema,
  },
  estimateTermGroupMemberRebuild,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
