import { z } from "zod";

import { deleteDocument } from "@/lib/documents/services/delete-document";
import { updateDocument } from "@/lib/documents/services/update-document";
import { updateDocumentBodySchema } from "@/lib/documents/schema";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.string().uuid() });

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
