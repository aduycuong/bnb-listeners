import { z } from "zod";

import { listDocuments } from "@/lib/documents/services/list-documents";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const listDocumentsQuerySchema = z.object({
  docType: z.string().min(1).optional(),
  embeddingStatus: z.string().min(1).optional(),
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
