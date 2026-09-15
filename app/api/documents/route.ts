import { z } from "zod";

import { DOCUMENT_TERM_FILTER_MODES } from "@/lib/documents/document-term-filter-config";
import { listDocuments } from "@/lib/documents/services/list-documents";
import { createApiHandler } from "@/lib/exposers/create-api-handler";

const listDocumentsQuerySchema = z.object({
  docType: z.string().min(1).optional(),
  embeddingStatus: z.string().min(1).optional(),
  dataSourceIds: z.string().optional(),
  dataSourceGroupId: z.uuid().optional(),
  termFilter: z.enum(DOCUMENT_TERM_FILTER_MODES).optional(),
  termIds: z.string().optional(),
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
        dataSourceIds: params.dataSourceIds
          ? params.dataSourceIds.split(",").filter(Boolean)
          : undefined,
        dataSourceGroupId: params.dataSourceGroupId,
        termFilterMode: params.termFilter,
        termIds: params.termIds
          ? params.termIds.split(",").filter(Boolean)
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
