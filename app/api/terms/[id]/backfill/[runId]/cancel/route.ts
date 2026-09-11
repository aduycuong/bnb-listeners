import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { termBackfillRunIdParamsSchema } from "@/lib/term-backfill/schema";
import { cancelTermBackfillRun } from "@/lib/term-backfill/services/cancel-term-backfill-run";

export const POST = createApiHandler(
  { parameters: termBackfillRunIdParamsSchema },
  cancelTermBackfillRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
