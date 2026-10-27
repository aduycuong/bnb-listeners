import { z } from "zod";

import { getAdminSpending } from "@/lib/admin-console/services/get-admin-spending";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const queryParamsSchema = z.object({
  days: z.coerce.number().int().positive().optional(),
});

export const GET = createApiHandler({ queryParams: queryParamsSchema }, getAdminSpending, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
