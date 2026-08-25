import { z } from "zod";

import { normalizeCronScheduleValue } from "@/lib/common/cron-presets";

import { SCHEDULABLE_JOB_TYPE_VALUES } from "./constants";
import { safeParseJobParams } from "./handlers/registry";

export const schedulableJobTypeSchema = z.enum(
  [...SCHEDULABLE_JOB_TYPE_VALUES] as [
    (typeof SCHEDULABLE_JOB_TYPE_VALUES)[number],
    ...(typeof SCHEDULABLE_JOB_TYPE_VALUES)[number][],
  ],
);

export const cronScheduleSchema = z
  .object({
    cron: z.string(),
    timezone: z.string().min(1, { error: "Timezone is required." }),
  })
  .transform((value) => normalizeCronScheduleValue(value));

export const jobParamsSchema = z.record(z.string(), z.unknown());

function addJobParamsIssues(
  ctx: z.RefinementCtx,
  jobType: z.infer<typeof schedulableJobTypeSchema>,
  params: unknown,
  pathPrefix: (string | number)[] = ["params"],
) {
  const result = safeParseJobParams(jobType, params);
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

export const createJobBodySchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }),
    jobType: schedulableJobTypeSchema,
    cronConfig: cronScheduleSchema,
    enabled: z.boolean().default(true),
    params: jobParamsSchema.default({}),
  })
  .superRefine((data, ctx) => {
    addJobParamsIssues(ctx, data.jobType, data.params);
  });

export const updateJobBodySchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }).optional(),
    jobType: schedulableJobTypeSchema.optional(),
    cronConfig: cronScheduleSchema.optional(),
    enabled: z.boolean().optional(),
    params: jobParamsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided",
  })
  .superRefine((data, ctx) => {
    if (data.params !== undefined && data.jobType !== undefined) {
      addJobParamsIssues(ctx, data.jobType, data.params);
    }
  });

export const jobFormSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required." }),
    jobType: schedulableJobTypeSchema,
    cronConfig: cronScheduleSchema,
    enabled: z.boolean(),
    params: jobParamsSchema,
  })
  .superRefine((data, ctx) => {
    addJobParamsIssues(ctx, data.jobType, data.params);
  });
