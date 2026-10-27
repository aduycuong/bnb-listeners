import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { compareCheckQuerySchema } from "@/lib/projects/schema";
import { checkCompareMembers } from "@/lib/projects/services/check-compare-members";

export const GET = createApiHandler(
  { queryParams: compareCheckQuerySchema },
  (params, ctx) =>
    checkCompareMembers({
      workspaceId: ctx.workspaceId,
      case: params.case,
      memberIds: params.memberIds,
    }),
  { allowedRoles: [], minWorkspacePermission: "read" },
);
