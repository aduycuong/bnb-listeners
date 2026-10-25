import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listProjectSummaries } from "@/lib/projects/services/list-project-summaries";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listProjectSummaries({ workspaceId: ctx.workspaceId }),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
