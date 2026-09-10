import { z } from "zod";

import { updateDocumentComments } from "@/lib/documents/services/update-document-comments";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  { parameters: documentIdSchema },
  updateDocumentComments,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
