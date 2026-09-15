import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateDataSourceBodySchema } from "@/lib/data-sources/schema";
import { deleteDataSource } from "@/lib/data-sources/services/delete-data-source";
import { getDataSource } from "@/lib/data-sources/services/get-data-source";
import { updateDataSource } from "@/lib/data-sources/services/update-data-source";

const dataSourceIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler({ parameters: dataSourceIdSchema }, getDataSource, {
  allowedRoles: [],
  minWorkspacePermission: "read",
});

export const PATCH = createApiHandler(
  { parameters: dataSourceIdSchema, requestBody: updateDataSourceBodySchema },
  updateDataSource,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler({ parameters: dataSourceIdSchema }, deleteDataSource, {
  allowedRoles: [],
  minWorkspacePermission: "edit",
});
