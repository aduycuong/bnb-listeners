import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { startResearchBodySchema } from "@/lib/research/schema";
import { listResearchRuns } from "@/lib/research/services/list-research-runs";
import { startResearchRun } from "@/lib/research/services/start-research-run";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listResearchRuns({}, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: startResearchBodySchema },
  startResearchRun,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
