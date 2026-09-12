import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { TERM_GROUP_TOP_TERMS_LIMIT } from "@/lib/term-groups/term-group-config";
import { listTermGroupTopTerms } from "@/lib/term-groups/services/list-term-group-top-terms";
import { TOPIC_DETAIL_CHART_PERIOD_PRESETS } from "@/lib/terms/term-detail-chart-config";
import { TERM_CARD_SORT_OPTIONS } from "@/lib/terms/term-card-config";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD." });

const termGroupTopTermsParamsSchema = z.object({
  id: z.uuid(),
});

const termGroupTopTermsQuerySchema = z
  .object({
    period: z.enum(TOPIC_DETAIL_CHART_PERIOD_PRESETS).default("last_7_days"),
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    sort: z.enum(TERM_CARD_SORT_OPTIONS.filter((s) => s !== "created_at")).default("count"),
    limit: z.coerce.number().int().min(1).max(50).default(TERM_GROUP_TOP_TERMS_LIMIT),
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
  {
    parameters: termGroupTopTermsParamsSchema,
    queryParams: termGroupTopTermsQuerySchema,
  },
  (params, ctx) =>
    listTermGroupTopTerms(
      {
        id: params.id,
        period: params.period,
        startDate: params.startDate,
        endDate: params.endDate,
        sort: params.sort,
        limit: params.limit,
      },
      ctx,
    ),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
