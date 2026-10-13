import { z } from "zod";

import { listAdminContentItems } from "@/lib/admin-console/services/list-admin-content-items";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  sourceId: z.uuid().optional(),
  kind: z.string().optional(),
  origin: z.string().optional(),
  collectRunId: z.uuid().optional(),
  q: z.string().optional(),
});

export const GET = createApiHandler({ queryParams: queryParamsSchema }, listAdminContentItems, {
  allowedRoles: ["admin"],
  requireWorkspace: false,
});
