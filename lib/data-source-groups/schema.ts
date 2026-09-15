import { z } from "zod";

export const createDataSourceGroupBodySchema = z.object({
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

export const updateDataSourceGroupBodySchema = z
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

export const setDataSourceGroupMembersBodySchema = z.object({
  dataSourceIds: z.array(z.uuid()),
});

export const dataSourceGroupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Name is required." })
    .max(100, { error: "Name must be 100 characters or fewer." }),
  description: z
    .string()
    .max(500, { error: "Description must be 500 characters or fewer." }),
});
