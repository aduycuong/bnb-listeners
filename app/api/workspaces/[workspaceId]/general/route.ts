import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateWorkspaceGeneralSchema } from "@/lib/workspaces/schema";
import { updateWorkspaceGeneral } from "@/lib/workspaces/services/update-workspace-general";

const workspaceIdRouteParamsSchema = z.object({
  workspaceId: z.uuid(),
});

export const PATCH = createApiHandler(
  {
    parameters: workspaceIdRouteParamsSchema,
    requestBody: updateWorkspaceGeneralSchema,
  },
  (params, ctx) =>
    updateWorkspaceGeneral({
      workspaceId: ctx.workspaceId,
      name: params.name,
      slug: params.slug,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "edit",
  },
);
