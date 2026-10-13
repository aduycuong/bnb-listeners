import { z } from "zod";

import { getAdminCollectRun } from "@/lib/admin-console/services/get-admin-collect-run";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler({ parameters: routeParamsSchema }, getAdminCollectRun, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
