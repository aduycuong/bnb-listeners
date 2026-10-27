import { z } from "zod";

import { MAX_REPORTS_PER_REQUEST, METRICS_CONFIG, REPORT_KEYS, REPORT_PERIOD_TYPES } from "./config";

/**
 * A report period (docs/decisions.md D28). `rolling`: the last `days` whole days, today
 * included. Calendar types: the week (Monday to Sunday), month, quarter or year that holds
 * `date`, today when left out. `custom`: `from` to `to`, both included. Days are whole days
 * of the project's timezone.
 */
export const reportPeriodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rolling"),
    days: z.number().int().min(1).max(METRICS_CONFIG.maxPeriodDays),
  }),
  z.object({
    type: z.enum(REPORT_PERIOD_TYPES),
    date: z.iso.date().optional(),
  }),
  z.object({
    type: z.literal("custom"),
    from: z.iso.date(),
    to: z.iso.date(),
  }),
]);

const limitParams = (max: number) =>
  z.object({ limit: z.number().int().min(1).max(max).optional() }).strict();
const noParams = z.object({}).strict();

/** Params each report takes; a report without options takes none. */
export const REPORT_PARAMS_SCHEMAS = {
  kpis: noParams,
  "sentiment-breakdown": noParams,
  "sentiment-trend": noParams,
  emotions: noParams,
  "aspect-sentiment": noParams,
  "channel-breakdown": noParams,
  "source-ranking": limitParams(50),
  "posting-heatmap": noParams,
  topics: limitParams(200),
  keywords: limitParams(200),
  "top-authors": limitParams(100),
  "author-tiers": noParams,
  "price-trend": noParams,
  "price-distribution": noParams,
  "buyer-questions": limitParams(50),
  "reputation-index": noParams,
  "reputation-trend": noParams,
  "product-sentiment": noParams,
} satisfies Record<(typeof REPORT_KEYS)[number], z.ZodType>;

/** Body of `POST /api/metrics/reports`: the picker's rolling period and the reports of a page. */
export const getReportsBodySchema = z
  .object({
    days: z
      .number()
      .int()
      .refine((days) => (METRICS_CONFIG.reportPeriodDays as readonly number[]).includes(days))
      .default(METRICS_CONFIG.defaultReportPeriodDays),
    reports: z
      .array(
        z.object({
          key: z.enum(REPORT_KEYS),
          params: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .min(1)
      .max(MAX_REPORTS_PER_REQUEST),
  })
  .transform(({ days, reports }) => ({ period: { type: "rolling" as const, days }, reports }));
