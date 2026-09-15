import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createDataSourceGroupBodySchema } from "@/lib/data-source-groups/schema";
import { createDataSourceGroup } from "@/lib/data-source-groups/services/create-data-source-group";
import { listDataSourceGroups } from "@/lib/data-source-groups/services/list-data-source-groups";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listDataSourceGroups({}, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createDataSourceGroupBodySchema },
  createDataSourceGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
