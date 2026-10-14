import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { evaluateEnrich } from "@/lib/mentions/services/evaluate-enrich";

const enrichEvaluationQueryParamsSchema = z.object({ sampleId: z.uuid().optional() });

export const GET = createApiHandler(
  { queryParams: enrichEvaluationQueryParamsSchema },
  (params, ctx) => evaluateEnrich({ projectId: ctx.projectId!, sampleId: params.sampleId }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
