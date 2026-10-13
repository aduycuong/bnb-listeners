import { z } from "zod";

import { listAdminRefreshSchedules } from "@/lib/admin-console/services/list-admin-refresh-schedules";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  sourceId: z.uuid().optional(),
  due: z.enum(["overdue", "upcoming"]).optional(),
});

export const GET = createApiHandler(
  { queryParams: queryParamsSchema },
  listAdminRefreshSchedules,
  { allowedRoles: ["admin"], requireWorkspace: false },
);
