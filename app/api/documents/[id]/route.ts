import { z } from "zod";

import { deleteDocument } from "@/lib/documents/services/delete-document";
import { getDocument } from "@/lib/documents/services/get-document";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler({ parameters: documentIdSchema }, getDocument, {
  allowedRoles: [],
  minWorkspacePermission: "read",
});

export const DELETE = createApiHandler(
  { parameters: documentIdSchema },
  deleteDocument,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
