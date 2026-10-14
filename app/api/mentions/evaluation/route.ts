import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { evaluateMatch } from "@/lib/mentions/services/evaluate-match";

const evaluationQueryParamsSchema = z.object({ sampleId: z.uuid().optional() });

export const GET = createApiHandler(
  { queryParams: evaluationQueryParamsSchema },
  (params, ctx) => evaluateMatch({ projectId: ctx.projectId!, sampleId: params.sampleId }),
  { allowedRoles: [], minWorkspacePermission: "read", requireProject: true },
);
