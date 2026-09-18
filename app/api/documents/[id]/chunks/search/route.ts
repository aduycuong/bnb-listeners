import { z } from "zod";

import { searchDocumentChunks } from "@/lib/chunking/services/search-document-chunks";
import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { RETRIEVAL_RETURN_LIMIT } from "@/lib/retrieval/config";

const documentIdSchema = z.object({ id: z.uuid() });

const searchDocumentChunksQuerySchema = z.object({
  q: z.string().trim().min(1, { error: "Search query is required." }).max(500),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(RETRIEVAL_RETURN_LIMIT * 2)
    .optional(),
});

export const GET = createApiHandler(
  {
    parameters: documentIdSchema,
    queryParams: searchDocumentChunksQuerySchema,
  },
  (params, ctx) =>
    searchDocumentChunks(
      {
        id: params.id,
        query: params.q,
        limit: params.limit,
      },
      ctx,
    ),
  { allowedRoles: [], minWorkspacePermission: "read" },
);
