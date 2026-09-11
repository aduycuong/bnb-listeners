import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateWorkspaceLlmSettingsSchema } from "@/lib/workspaces/schema";
import { deleteWorkspace } from "@/lib/workspaces/services/delete-workspace";
import { updateWorkspaceLlmSettings } from "@/lib/workspaces/services/update-workspace-llm-settings";

const workspaceIdRouteParamsSchema = z.object({
  workspaceId: z.uuid(),
});

export const PATCH = createApiHandler(
  {
    parameters: workspaceIdRouteParamsSchema,
    requestBody: updateWorkspaceLlmSettingsSchema,
  },
  (params, ctx) =>
    updateWorkspaceLlmSettings({
      workspaceId: ctx.workspaceId,
      dataCollectionScope: params.dataCollectionScope,
      autoCreateTerms: params.autoCreateTerms,
      termLanguage: params.termLanguage,
      termCriteria: params.termCriteria,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "edit",
  },
);

export const DELETE = createApiHandler(
  {
    parameters: workspaceIdRouteParamsSchema,
  },
  (_params, ctx) =>
    deleteWorkspace({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "owner",
  },
);
