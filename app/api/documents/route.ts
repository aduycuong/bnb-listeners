import { z } from "zod";

import { createDocument } from "@/lib/documents/services/create-document";
import { listDocuments } from "@/lib/documents/services/list-documents";
import { createDocumentBodySchema } from "@/lib/documents/schema";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const listDocumentsQuerySchema = z.object({
  docType: z.string().min(1).optional(),
  embeddingStatus: z.string().min(1).optional(),
  groupIds: z.string().optional(),
  jobIds: z.string().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = createApiHandler(
  { queryParams: listDocumentsQuerySchema },
  (params, ctx) =>
    listDocuments(
      {
        docType: params.docType,
        embeddingStatus: params.embeddingStatus,
        groupIds: params.groupIds
          ? params.groupIds.split(",").filter(Boolean)
          : undefined,
        jobIds: params.jobIds
          ? params.jobIds.split(",").filter(Boolean)
          : undefined,
        offset: params.offset,
        limit: params.limit,
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
