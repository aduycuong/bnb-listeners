import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateWorkspaceLlmSettingsSchema } from "@/lib/llm/schema";
import { getWorkspaceLlmSettings } from "@/lib/llm/services/get-workspace-llm-settings";
import { updateWorkspaceLlmSettings } from "@/lib/llm/services/update-workspace-llm-settings";

export const GET = createApiHandler(
  {},
  async (_params, ctx) => getWorkspaceLlmSettings(ctx.workspaceId),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "read",
  },
);

export const PATCH = createApiHandler(
  { requestBody: updateWorkspaceLlmSettingsSchema },
  (params, ctx) =>
    updateWorkspaceLlmSettings({
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      proposeTopic: params.proposeTopic,
      scoreRelevance: params.scoreRelevance,
    }),
  {
    allowedRoles: ["user", "admin"],
    requireWorkspace: true,
    minWorkspacePermission: "edit",
  },
);
