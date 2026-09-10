import { z } from "zod";

import { listDocumentChunks } from "@/lib/chunking/services/list-document-chunks";
import { runDocumentChunks } from "@/lib/documents/services/run-document-chunks";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const documentIdSchema = z.object({ id: z.uuid() });

export const GET = createApiHandler(
  { parameters: documentIdSchema },
  listDocumentChunks,
  { allowedRoles: [], minWorkspacePermission: "read" },
);

export const POST = createApiHandler(
  { parameters: documentIdSchema },
  runDocumentChunks,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
