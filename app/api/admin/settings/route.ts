import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listSettings } from "@/lib/settings/services/list-settings";

export const GET = createApiHandler({}, () => listSettings(), {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
