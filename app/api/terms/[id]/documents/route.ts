import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listTermDocuments } from "@/lib/terms/services/list-term-documents";
import { TERM_DETAIL_DOCUMENTS_PAGE_SIZE } from "@/lib/terms/term-detail-chart-config";

const termDocumentsParamsSchema = z.object({
  id: z.uuid(),
});

const termDocumentsQuerySchema = z.object({
  jobIds: z
    .preprocess(
      (value) => {
        if (typeof value !== "string" || value.length === 0) {
          return undefined;
        }

        return value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
      },
      z.array(z.uuid()).optional(),
    ),
  search: z.string().trim().max(200).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(TERM_DETAIL_DOCUMENTS_PAGE_SIZE)
    .default(TERM_DETAIL_DOCUMENTS_PAGE_SIZE),
});

export const GET = createApiHandler(
  {
    parameters: termDocumentsParamsSchema,
    queryParams: termDocumentsQuerySchema,
  },
  (params, ctx) =>
    listTermDocuments(
      {
        termId: params.id,
        jobIds: params.jobIds,
        search: params.search,
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
