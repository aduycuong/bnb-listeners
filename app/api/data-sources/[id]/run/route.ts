import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { runDataSource } from "@/lib/data-sources/services/run-data-source";

const dataSourceIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler({ parameters: dataSourceIdSchema }, runDataSource, {
  allowedRoles: [],
  minWorkspacePermission: "edit",
});
