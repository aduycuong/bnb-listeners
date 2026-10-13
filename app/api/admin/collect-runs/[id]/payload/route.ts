import { z } from "zod";

import { getCollectRunPayload } from "@/lib/admin-console/services/get-collect-run-payload";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const routeParamsSchema = z.object({
  id: z.uuid(),
});

const queryParamsSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const GET = createApiHandler(
  { parameters: routeParamsSchema, queryParams: queryParamsSchema },
  getCollectRunPayload,
  { allowedRoles: ["admin"], requireWorkspace: false },
);
