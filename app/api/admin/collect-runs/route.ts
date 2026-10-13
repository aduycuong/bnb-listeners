import { z } from "zod";

import { listAdminCollectRuns } from "@/lib/admin-console/services/list-admin-collect-runs";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  sourceId: z.uuid().optional(),
  connector: z.string().optional(),
  status: z.string().optional(),
});

export const GET = createApiHandler({ queryParams: queryParamsSchema }, listAdminCollectRuns, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
