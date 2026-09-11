import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termBackfillEstimateBodySchema } from "@/lib/term-backfill/schema";
import { estimateTermBackfill } from "@/lib/term-backfill/services/estimate-term-backfill";

const termIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  {
    parameters: termIdSchema,
    requestBody: termBackfillEstimateBodySchema,
  },
  estimateTermBackfill,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
