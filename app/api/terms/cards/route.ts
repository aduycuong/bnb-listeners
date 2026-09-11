import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { listTermCards } from "@/lib/terms/services/list-term-cards";
import {
  TERM_CARD_PAGE_SIZE,
  TERM_CARD_PERIOD_PRESETS,
  TERM_CARD_SORT_OPTIONS,
} from "@/lib/terms/term-card-config";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD." });

const listTermCardsQuerySchema = z
  .object({
    period: z.enum(TERM_CARD_PERIOD_PRESETS).default("last_7_days"),
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    sort: z.enum(TERM_CARD_SORT_OPTIONS).default("trend"),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(TERM_CARD_PAGE_SIZE)
      .default(TERM_CARD_PAGE_SIZE),
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
  { queryParams: listTermCardsQuerySchema },
  (params, ctx) => listTermCards(params, ctx),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
