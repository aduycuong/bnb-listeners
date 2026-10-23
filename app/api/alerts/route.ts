import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listProjectAlerts } from "@/lib/alerts/services/list-project-alerts";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listProjectAlerts(ctx.projectId!),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
