import { z } from "zod";

import { normalizeCronScheduleValue } from "@/lib/common/cron-presets";

import { SOURCE_TYPE_VALUES } from "./constants";
import { safeParseSourceParams } from "./handlers/registry";

export const sourceTypeSchema = z.enum(
  [...SOURCE_TYPE_VALUES] as [
    (typeof SOURCE_TYPE_VALUES)[number],
    ...(typeof SOURCE_TYPE_VALUES)[number][],
  ],
);

export const cronScheduleSchema = z
  .object({
    cron: z.string(),
    timezone: z.string().min(1, { error: "Timezone is required." }),
  })
  .transform((value) => normalizeCronScheduleValue(value));

export const sourceParamsSchema = z.record(z.string(), z.unknown());

function addSourceParamsIssues(
  ctx: z.RefinementCtx,
  sourceType: z.infer<typeof sourceTypeSchema>,
  params: unknown,
  pathPrefix: (string | number)[] = ["params"],
) {
  const result = safeParseSourceParams(sourceType, params);
  if (result.success) {
    return;
  }

  for (const issue of result.error.issues) {
    ctx.addIssue({
      ...issue,
      path: [...pathPrefix, ...issue.path],
    });
  }
}

export const createDataSourceBodySchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }),
    sourceType: sourceTypeSchema,
    cronConfig: cronScheduleSchema,
    enabled: z.boolean().default(true),
    params: sourceParamsSchema.default({}),
  })
  .superRefine((data, ctx) => {
    addSourceParamsIssues(ctx, data.sourceType, data.params);
  });

export const updateDataSourceBodySchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }).optional(),
    sourceType: sourceTypeSchema.optional(),
    cronConfig: cronScheduleSchema.optional(),
    enabled: z.boolean().optional(),
    params: sourceParamsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided",
  })
  .superRefine((data, ctx) => {
    if (data.params !== undefined && data.sourceType !== undefined) {
      addSourceParamsIssues(ctx, data.sourceType, data.params);
    }
  });

export const dataSourceFormSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }),
    sourceType: sourceTypeSchema,
    cronConfig: cronScheduleSchema,
    enabled: z.boolean(),
    params: sourceParamsSchema,
  })
  .superRefine((data, ctx) => {
    addSourceParamsIssues(ctx, data.sourceType, data.params);
  });
