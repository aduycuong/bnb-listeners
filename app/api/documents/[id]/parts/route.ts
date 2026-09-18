import { z } from "zod";

import { listDocumentParts } from "@/lib/document-parts/services/list-document-parts";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: documentIdSchema },
  listDocumentParts,
  { allowedRoles: [], minWorkspacePermission: "read" },
);
