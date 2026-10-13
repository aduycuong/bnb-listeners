import { listAdminSources } from "@/lib/admin-console/services/list-admin-sources";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

export const GET = createApiHandler({}, () => listAdminSources(), {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
