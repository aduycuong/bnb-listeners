import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateDataSourceGroupBodySchema } from "@/lib/data-source-groups/schema";
import { deleteDataSourceGroup } from "@/lib/data-source-groups/services/delete-data-source-group";
import { getDataSourceGroup } from "@/lib/data-source-groups/services/get-data-source-group";
import { updateDataSourceGroup } from "@/lib/data-source-groups/services/update-data-source-group";

const dataSourceGroupIdSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler(
  { parameters: dataSourceGroupIdSchema },
  getDataSourceGroup,
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const PATCH = createApiHandler(
  {
    parameters: dataSourceGroupIdSchema,
    requestBody: updateDataSourceGroupBodySchema,
  },
  updateDataSourceGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: dataSourceGroupIdSchema },
  deleteDataSourceGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
