import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { reportPeriodSchema } from "@/lib/metrics/schema";
import { generateReport } from "@/lib/reports/services/generate-report";
import { listReports } from "@/lib/reports/services/list-reports";

const listReportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const generateReportBodySchema = z.object({ period: reportPeriodSchema });

export const GET = createApiHandler(
  { queryParams: listReportsQuerySchema },
  (params, ctx) => listReports({ projectId: ctx.projectId!, limit: params.limit }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);

/** Generates (or regenerates) the report of a period; calls the model (D29). */
export const POST = createApiHandler(
  { requestBody: generateReportBodySchema },
  (params, ctx) => generateReport({ projectId: ctx.projectId!, period: params.period, trigger: "user" }),
  { allowedRoles: [], minWorkspacePermission: "edit", requireProject: true },
);
