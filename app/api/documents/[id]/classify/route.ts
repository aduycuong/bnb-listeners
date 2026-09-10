import { z } from "zod";

import { runDocumentClassify } from "@/lib/documents/services/run-document-classify";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  { parameters: documentIdSchema },
  runDocumentClassify,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
