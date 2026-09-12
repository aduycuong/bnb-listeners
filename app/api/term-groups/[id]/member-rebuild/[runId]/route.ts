import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termGroupMemberRebuildRunIdParamsSchema } from "@/lib/term-group-member-rebuild/schema";
import { getTermGroupMemberRebuildRun } from "@/lib/term-group-member-rebuild/services/get-term-group-member-rebuild-run";

export const GET = createApiHandler(
  {
    parameters: termGroupMemberRebuildRunIdParamsSchema,
  },
  getTermGroupMemberRebuildRun,
  { allowedRoles: [], minWorkspacePermission: "read" },
);
