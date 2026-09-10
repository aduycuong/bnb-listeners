import { z } from "zod";

import { runDocumentScore } from "@/lib/documents/services/run-document-score";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const POST = createApiHandler(
  { parameters: documentIdSchema },
  runDocumentScore,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
