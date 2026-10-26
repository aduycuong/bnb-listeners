import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getReport } from "@/lib/reports/services/get-report";

const routeParamsSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: routeParamsSchema },
  (params, ctx) => getReport({ projectId: ctx.projectId!, reportId: params.id }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
