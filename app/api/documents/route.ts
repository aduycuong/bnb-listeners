import { z } from "zod";

import { createDocument } from "@/lib/documents/services/create-document";
import { listDocuments } from "@/lib/documents/services/list-documents";
import { createDocumentBodySchema } from "@/lib/documents/schema";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const listDocumentsQuerySchema = z.object({
  docType: z.string().min(1).optional(),
  embeddingStatus: z.string().min(1).optional(),
});

export const GET = createApiHandler(
  { queryParams: listDocumentsQuerySchema },
  (params, ctx) =>
    listDocuments(
      {
        docType: params.docType,
        embeddingStatus: params.embeddingStatus,
      },
      ctx,
    ),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);

export const POST = createApiHandler(
  { requestBody: createDocumentBodySchema },
  createDocument,
  { allowedRoles: [], minWorkspacePermission: "edit" },
);
