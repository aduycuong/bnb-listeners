import { z } from "zod";

import { METRICS_CONFIG } from "./config";

/** Query of the Overview and Sentiment metric routes. */
export const metricsReportQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine((days) => (METRICS_CONFIG.reportPeriodDays as readonly number[]).includes(days))
    .default(METRICS_CONFIG.reportPeriodDays[0]),
});
