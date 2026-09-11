import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termBackfillRunIdParamsSchema } from "@/lib/term-backfill/schema";
import { getTermBackfillRun } from "@/lib/term-backfill/services/get-term-backfill-run";

export const GET = createApiHandler(
  { parameters: termBackfillRunIdParamsSchema },
  getTermBackfillRun,
  { allowedRoles: [], minWorkspacePermission: "read" },
);
