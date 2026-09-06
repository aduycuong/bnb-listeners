import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import {
  deleteSourceGroupBodySchema,
  updateSourceGroupBodySchema,
} from "@/lib/source-groups/schema";
import { deleteSourceGroup } from "@/lib/source-groups/services/delete-source-group";
import { updateSourceGroup } from "@/lib/source-groups/services/update-source-group";

const sourceGroupIdSchema = z.object({ id: z.uuid() });

export const PATCH = createApiHandler(
  { parameters: sourceGroupIdSchema, requestBody: updateSourceGroupBodySchema },
  updateSourceGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: sourceGroupIdSchema, requestBody: deleteSourceGroupBodySchema },
  deleteSourceGroup,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
