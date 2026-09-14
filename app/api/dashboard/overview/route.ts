import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getDashboardOverview } from "@/lib/dashboard/services/get-dashboard-overview";

export const GET = createApiHandler(
  {},
  (_params, ctx) => getDashboardOverview(ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
