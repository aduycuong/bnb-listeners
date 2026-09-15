import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listSourceRuns } from "@/lib/data-sources/services/list-source-runs";

const dataSourceIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler({ parameters: dataSourceIdSchema }, listSourceRuns, {
  allowedRoles: [],
  minWorkspacePermission: "read",
});
