import { z } from "zod";

import { getAdminSource } from "@/lib/admin-console/services/get-admin-source";
import { updateSourceSettingsBodySchema } from "@/lib/connectors/schema";
import { deleteSource } from "@/lib/connectors/services/delete-source";
import { updateSourceSettings } from "@/lib/connectors/services/update-source-settings";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler({ parameters: routeParamsSchema }, getAdminSource, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});

export const PATCH = createApiHandler(
  { parameters: routeParamsSchema, requestBody: updateSourceSettingsBodySchema },
  updateSourceSettings,
  { allowedRoles: ["admin"], requireWorkspace: false },
);

export const DELETE = createApiHandler({ parameters: routeParamsSchema }, deleteSource, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
