import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { setDataSourceGroupMembersBodySchema } from "@/lib/data-source-groups/schema";
import { listDataSourceGroupMembers } from "@/lib/data-source-groups/services/list-data-source-group-members";
import { setDataSourceGroupMembers } from "@/lib/data-source-groups/services/set-data-source-group-members";

const dataSourceGroupIdSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler(
  { parameters: dataSourceGroupIdSchema },
  (params, ctx) => listDataSourceGroupMembers({ id: params.id }, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const PUT = createApiHandler(
  {
    parameters: dataSourceGroupIdSchema,
    requestBody: setDataSourceGroupMembersBodySchema,
  },
  (params, ctx) =>
    setDataSourceGroupMembers(
      { id: params.id, dataSourceIds: params.dataSourceIds },
      ctx,
    ),
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
