import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateTermGroupBodySchema } from "@/lib/term-groups/schema";
import { deleteTermGroup } from "@/lib/term-groups/services/delete-term-group";
import { getTermGroup } from "@/lib/term-groups/services/get-term-group";
import { updateTermGroup } from "@/lib/term-groups/services/update-term-group";

const termGroupIdSchema = z.object({
  id: z.uuid(),
});

export const GET = createApiHandler(
  { parameters: termGroupIdSchema },
  getTermGroup,
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const PATCH = createApiHandler(
  {
    parameters: termGroupIdSchema,
    requestBody: updateTermGroupBodySchema,
  },
  updateTermGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: termGroupIdSchema },
  deleteTermGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
