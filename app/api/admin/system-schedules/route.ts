import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listSystemSchedules } from "@/lib/system-schedules/services/list-system-schedules";

export const GET = createApiHandler({}, async () => listSystemSchedules(), {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
