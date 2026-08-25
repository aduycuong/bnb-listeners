import { z } from "zod";

import { deleteDocument } from "@/lib/documents/services/delete-document";
import { getDocument } from "@/lib/documents/services/get-document";
import { updateDocument } from "@/lib/documents/services/update-document";
import { updateDocumentBodySchema } from "@/lib/documents/schema";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler({ parameters: documentIdSchema }, getDocument, {
  allowedRoles: [],
  minWorkspacePermission: "read",
});

export const PATCH = createApiHandler(
  { parameters: documentIdSchema, requestBody: updateDocumentBodySchema },
  updateDocument,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);

export const DELETE = createApiHandler(
  { parameters: documentIdSchema },
  deleteDocument,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
