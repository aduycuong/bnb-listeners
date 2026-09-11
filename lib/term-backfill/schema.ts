import { z } from "zod";

import { chatModelIdSchema } from "@/lib/langchain";
import {
  TERM_BACKFILL_CONFIDENCE_MIN,
  TERM_BACKFILL_QUALITY_MIN,
} from "@/lib/terms/term-backfill-config";

export const termBackfillEstimateBodySchema = z.object({
  newListeningStartedAt: z.iso.datetime({ offset: true }),
  model: chatModelIdSchema.optional(),
  qualityMin: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(TERM_BACKFILL_QUALITY_MIN),
  /** When true, re-evaluate documents already assigned to this term. */
  includeAlreadyAssigned: z.boolean().optional().default(false),
});

export const termBackfillCreateBodySchema = termBackfillEstimateBodySchema;

export const termBackfillRunIdParamsSchema = z.object({
  id: z.uuid(),
  runId: z.uuid(),
});
