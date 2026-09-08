import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listTopicDocuments } from "@/lib/topics/services/list-topic-documents";
import { TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE } from "@/lib/topics/topic-detail-chart-config";

const topicDocumentsParamsSchema = z.object({
  id: z.uuid(),
});

const topicDocumentsQuerySchema = z.object({
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
    .max(TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE)
    .default(TOPIC_DETAIL_DOCUMENTS_PAGE_SIZE),
});

export const GET = createApiHandler(
  {
    parameters: topicDocumentsParamsSchema,
    queryParams: topicDocumentsQuerySchema,
  },
  (params, ctx) =>
    listTopicDocuments(
      {
        topicId: params.id,
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
