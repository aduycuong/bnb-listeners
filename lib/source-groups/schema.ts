import { z } from "zod";

export const createSourceGroupBodySchema = z.object({
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

export const updateSourceGroupBodySchema = z
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

/**
 * When deleting a source group the caller may optionally specify a group to
 * move all jobs and documents to.  If omitted the service moves everything to
 * the workspace-scoped "No group" source group.
 */
export const deleteSourceGroupBodySchema = z.object({
  moveToGroupId: z.uuid().optional(),
});

export const sourceGroupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .max(500, { error: "Description must be 500 characters or fewer." }),
});

