import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateCompareMembersSchema } from "@/lib/projects/schema";
import { getCompareMembers } from "@/lib/projects/services/get-compare-members";
import { updateCompareMembers } from "@/lib/projects/services/update-compare-members";

const projectIdRouteParamsSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: projectIdRouteParamsSchema },
  (params, ctx) => getCompareMembers({ workspaceId: ctx.workspaceId, projectId: params.id }),
  { allowedRoles: [], minWorkspacePermission: "read" },
);

export const PUT = createApiHandler(
  { parameters: projectIdRouteParamsSchema, requestBody: updateCompareMembersSchema },
  (params, ctx) =>
    updateCompareMembers({
      workspaceId: ctx.workspaceId,
      projectId: params.id,
      memberIds: params.memberIds,
    }),
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
