import { getAdminOverview } from "@/lib/admin-console/services/get-admin-overview";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

export const GET = createApiHandler({}, () => getAdminOverview(), {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
