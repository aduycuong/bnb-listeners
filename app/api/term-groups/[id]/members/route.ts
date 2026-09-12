import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import {
  setTermGroupMembersBodySchema,
} from "@/lib/term-groups/schema";
import { listTermGroupMembers } from "@/lib/term-groups/services/list-term-group-members";
import { setTermGroupMembers } from "@/lib/term-groups/services/set-term-group-members";

const termGroupIdSchema = z.object({
  id: z.uuid(),
});

const listTermGroupMembersQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const GET = createApiHandler(
  {
    parameters: termGroupIdSchema,
    queryParams: listTermGroupMembersQuerySchema,
  },
  (params, ctx) =>
    listTermGroupMembers({ id: params.id, search: params.search }, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const PUT = createApiHandler(
  {
    parameters: termGroupIdSchema,
    requestBody: setTermGroupMembersBodySchema,
  },
  (params, ctx) =>
    setTermGroupMembers({ id: params.id, termIds: params.termIds }, ctx),
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
