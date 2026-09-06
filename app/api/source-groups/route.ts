import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createSourceGroupBodySchema } from "@/lib/source-groups/schema";
import { createSourceGroup } from "@/lib/source-groups/services/create-source-group";
import { listSourceGroups } from "@/lib/source-groups/services/list-source-groups";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listSourceGroups({}, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createSourceGroupBodySchema },
  createSourceGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
