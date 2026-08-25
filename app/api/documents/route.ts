import { z } from "zod";

import { createDocument } from "@/lib/documents/services/create-document";
import { createDocumentBodySchema } from "@/lib/documents/schema";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

export const POST = createApiHandler(
  { requestBody: createDocumentBodySchema },
  createDocument,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
