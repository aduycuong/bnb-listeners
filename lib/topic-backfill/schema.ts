import { z } from "zod";

import { chatModelIdSchema } from "@/lib/langchain";
import {
  TOPIC_BACKFILL_CONFIDENCE_MIN,
  TOPIC_BACKFILL_QUALITY_MIN,
} from "@/lib/topics/topic-backfill-config";

export const topicBackfillEstimateBodySchema = z.object({
  newListeningStartedAt: z.iso.datetime({ offset: true }),
  model: chatModelIdSchema.optional(),
  qualityMin: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(TOPIC_BACKFILL_QUALITY_MIN),
  /** When true, re-evaluate documents already assigned to this topic. */
  includeAlreadyAssigned: z.boolean().optional().default(false),
});

export const topicBackfillCreateBodySchema = topicBackfillEstimateBodySchema;

export const topicBackfillRunIdParamsSchema = z.object({
  id: z.uuid(),
  runId: z.uuid(),
});
