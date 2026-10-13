import { z } from "zod";

import { getAdminSource } from "@/lib/admin-console/services/get-admin-source";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler({ parameters: routeParamsSchema }, getAdminSource, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
