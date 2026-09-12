import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termGroupMemberRebuildRunIdParamsSchema } from "@/lib/term-group-member-rebuild/schema";
import { cancelTermGroupMemberRebuildRun } from "@/lib/term-group-member-rebuild/services/cancel-term-group-member-rebuild-run";

export const POST = createApiHandler(
  {
    parameters: termGroupMemberRebuildRunIdParamsSchema,
  },
  cancelTermGroupMemberRebuildRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
