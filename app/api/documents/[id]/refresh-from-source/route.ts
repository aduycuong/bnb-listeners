import { z } from "zod";

import { refreshDocumentFromSource } from "@/lib/documents/services/refresh-document-from-source";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  { parameters: documentIdSchema },
  refreshDocumentFromSource,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
