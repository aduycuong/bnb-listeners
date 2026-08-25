import { z } from "zod";

export const qstashJobEnvelopeSchema = z.object({
  jobName: z.string().min(1, "jobName is required"),
  payload: z.unknown().optional(),
  userId: z.string().optional(),
});

export type QstashJobEnvelope = z.infer<typeof qstashJobEnvelopeSchema>;

export const addJobRequestSchema = z.object({
  jobName: z.string().min(1, "jobName is required"),
  payload: z.unknown().optional(),
  /**
   * Optional delay before QStash delivers the message to the callback URL.
   */
  delay: z.number().optional(),
  /**
   * Optional flow control configuration for this job.
   * See Upstash QStash Flow Control docs.
   */
  flowControl: z
    .object({
      key: z.string().min(1, "flowControl.key is required"),
      parallelism: z.number().optional(),
      ratePerSecond: z.number().optional(),
      rate: z.number().optional(),
      period: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

export const scheduleJobRequestSchema = z.object({
  jobName: z.string().min(1, "jobName is required"),
  payload: z.unknown().optional(),

  /**
   * Cron expression in QStash format
   * with timezone example: CRON_TZ=America/New_York 0 4 * * *
   * Refs: https://upstash.com/docs/qstash/features/schedules#timezones
   */
  cron: z.string().min(1, "cron is required"),

  /**
   * Optional custom schedule id (if omitted, QStash will generate one).
   */
  scheduleId: z.string().optional(),
});

