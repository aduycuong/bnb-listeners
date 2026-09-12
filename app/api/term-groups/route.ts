import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { createTermGroupBodySchema } from "@/lib/term-groups/schema";
import { createTermGroup } from "@/lib/term-groups/services/create-term-group";
import { listTermGroups } from "@/lib/term-groups/services/list-term-groups";

export const GET = createApiHandler(
  {},
  (_params, ctx) => listTermGroups({}, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createTermGroupBodySchema },
  createTermGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
