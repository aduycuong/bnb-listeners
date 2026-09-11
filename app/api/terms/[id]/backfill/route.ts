import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termBackfillCreateBodySchema } from "@/lib/term-backfill/schema";
import { createTermBackfillRun } from "@/lib/term-backfill/services/create-term-backfill-run";

const termIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  {
    parameters: termIdSchema,
    requestBody: termBackfillCreateBodySchema,
  },
  createTermBackfillRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
