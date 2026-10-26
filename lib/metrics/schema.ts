import { z } from "zod";

import { METRICS_CONFIG, REPORT_PERIOD_TYPES } from "./config";

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

/** Query of the dashboard metric routes: the rolling periods of the date picker. */
export const metricsReportQuerySchema = z
  .object({
    days: z.coerce
      .number()
      .int()
      .refine((days) => (METRICS_CONFIG.reportPeriodDays as readonly number[]).includes(days))
      .default(METRICS_CONFIG.reportPeriodDays[0]),
  })
  .transform(({ days }) => ({ period: { type: "rolling" as const, days } }));
