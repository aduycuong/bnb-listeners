import { getAdminSchedulerState } from "@/lib/admin-console/services/get-admin-scheduler-state";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

export const GET = createApiHandler({}, () => getAdminSchedulerState(), {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
