import { z } from "zod";

import { TERM_MERGE_MAX_SOURCES } from "./term-config";

export const createTermBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .trim()
    .max(500, { error: "Description must be 500 characters or fewer." })
    .optional(),
});

export const updateTermBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Name is required." })
      .max(100, { error: "Name must be 100 characters or fewer." })
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, { error: "Description must be 500 characters or fewer." })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided",
  });

export const mergeTermsNewTargetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .trim()
    .max(500, { error: "Description must be 500 characters or fewer." })
    .optional(),
});

export const mergeTermsBodySchema = z
  .object({
    sourceIds: z
      .array(z.uuid())
      .min(1, { error: "At least one source term is required." })
      .max(TERM_MERGE_MAX_SOURCES, {
        error: `Cannot merge more than ${TERM_MERGE_MAX_SOURCES} source terms at once.`,
      }),
    targetId: z.uuid().optional(),
    newTerm: mergeTermsNewTargetSchema.optional(),
  })
  .refine((data) => Boolean(data.targetId) !== Boolean(data.newTerm), {
    error: "Provide either targetId or newTerm, not both.",
  });

export const termFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .max(500, { error: "Description must be 500 characters or fewer." }),
});
