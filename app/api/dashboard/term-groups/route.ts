import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getDashboardTermGroups } from "@/lib/dashboard/services/get-dashboard-term-groups";

export const GET = createApiHandler(
  {},
  (_params, ctx) => getDashboardTermGroups(ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
