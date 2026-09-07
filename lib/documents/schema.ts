import { z } from "zod";

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
