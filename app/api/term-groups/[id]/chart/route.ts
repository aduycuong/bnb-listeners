import { z } from "zod";

import { createApiHandler } from "@/lib/exposers/create-api-handler";
import { getTermGroupChart } from "@/lib/term-groups/services/get-term-group-chart";
import {
  TOPIC_DETAIL_CHART_METRICS,
  TOPIC_DETAIL_CHART_PERIOD_PRESETS,
} from "@/lib/terms/term-detail-chart-config";

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date must be YYYY-MM-DD." });

const termGroupChartParamsSchema = z.object({
  id: z.uuid(),
});

const termGroupChartQuerySchema = z
  .object({
    period: z.enum(TOPIC_DETAIL_CHART_PERIOD_PRESETS).default("last_7_days"),
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    metric: z.enum(TOPIC_DETAIL_CHART_METRICS).default("doc_count"),
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
    parameters: termGroupChartParamsSchema,
    queryParams: termGroupChartQuerySchema,
  },
  (params, ctx) =>
    getTermGroupChart(
      {
        id: params.id,
        period: params.period,
        startDate: params.startDate,
        endDate: params.endDate,
        metric: params.metric,
      },
      ctx,
    ),
  {
    allowedRoles: [],
    minWorkspacePermission: "read",
  },
);
