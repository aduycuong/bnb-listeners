import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { updateTermBodySchema } from "@/lib/terms/schema";
import { deleteTerm } from "@/lib/terms/services/delete-term";
import { getTerm } from "@/lib/terms/services/get-term";
import { updateTerm } from "@/lib/terms/services/update-term";

const termIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: termIdSchema },
  getTerm,
  { allowedRoles: [], minWorkspacePermission: "read" },
);

export const PATCH = createApiHandler(
  { parameters: termIdSchema, requestBody: updateTermBodySchema },
  updateTerm,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: termIdSchema },
  deleteTerm,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
