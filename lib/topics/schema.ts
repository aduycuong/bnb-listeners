import { z } from "zod";

export const createTopicBodySchema = z.object({
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
  parentId: z.uuid().nullable().optional(),
  verified: z.boolean().optional(),
});

export const updateTopicBodySchema = z
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
    parentId: z.uuid().nullable().optional(),
    verified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided",
  });

export const topicFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .max(500, { error: "Description must be 500 characters or fewer." }),
  parentId: z.string(),
  verified: z.boolean(),
});
