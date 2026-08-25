import { z } from "zod";

export const createDocumentBodySchema = z.object({
  docType: z.string().min(1),
  sourceKey: z.string().min(1),
  sourceName: z.string().min(1),
  sourceId: z.string().min(1),
  title: z.string().optional(),
  rawContent: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** ISO 8601 datetime: when the content was originally published by the source. */
  publishedAt: z.iso.datetime().optional(),
});

export const updateDocumentBodySchema = z
  .object({
    docType: z.string().min(1).optional(),
    sourceKey: z.string().min(1).optional(),
    sourceName: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
    title: z.string().optional(),
    rawContent: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
