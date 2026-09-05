import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listTopicCards } from "@/lib/topics/services/list-topic-cards";
import {
  TOPIC_CARD_PAGE_SIZE,
  TOPIC_CARD_PERIOD_PRESETS,
  TOPIC_CARD_SORT_OPTIONS,
} from "@/lib/topics/topic-card-config";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD." });

const listTopicCardsQuerySchema = z
  .object({
    period: z.enum(TOPIC_CARD_PERIOD_PRESETS).default("last_7_days"),
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    sort: z.enum(TOPIC_CARD_SORT_OPTIONS).default("trend"),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(TOPIC_CARD_PAGE_SIZE)
      .default(TOPIC_CARD_PAGE_SIZE),
  })
  .superRefine((value, ctx) => {
    if (value.period !== "custom") {
      return;
    }

    if (!value.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "startDate is required for custom period.",
      });
    }

    if (!value.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "endDate is required for custom period.",
      });
    }
  });

export const GET = createApiHandler(
  { queryParams: listTopicCardsQuerySchema },
  (params, ctx) => listTopicCards(params, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
