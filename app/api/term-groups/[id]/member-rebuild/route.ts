import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termGroupMemberRebuildCreateBodySchema } from "@/lib/term-group-member-rebuild/schema";
import { createTermGroupMemberRebuildRun } from "@/lib/term-group-member-rebuild/services/create-term-group-member-rebuild-run";

const termGroupIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  {
    parameters: termGroupIdSchema,
    requestBody: termGroupMemberRebuildCreateBodySchema,
  },
  createTermGroupMemberRebuildRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
