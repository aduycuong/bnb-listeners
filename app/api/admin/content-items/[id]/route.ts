import { z } from "zod";

import { getAdminContentItem } from "@/lib/admin-console/services/get-admin-content-item";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler({ parameters: routeParamsSchema }, getAdminContentItem, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
