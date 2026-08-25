import type { z } from "zod";

import type { SchedulableJobType } from "../constants";
import type { JobHandlerContext } from "./types";
import {
  SCRAPE_FACEBOOK_DEFAULT_PARAMS,
  executeScrapeFacebook,
  scrapeFacebookParamsSchema,
} from "./scrape-facebook";
import {
  SCRAPE_WEBSITE_DEFAULT_PARAMS,
  executeScrapeWebsite,
  scrapeWebsiteParamsSchema,
} from "./scrape-website";

export type JobHandlerConfig = {
  label: string;
  description: string;
  paramsSchema: z.ZodType<Record<string, unknown>>;
  defaultParams: Record<string, unknown>;
  execute: (
    params: Record<string, unknown>,
    context: JobHandlerContext,
  ) => Promise<void>;
  /**
   * When true, `job_runs` stays `running` after execute returns.
   * Another path (for example a Bright Data webhook) must complete the run.
   */
  completesAsynchronously?: boolean;
};

export const JOB_HANDLERS = {
  "scrape-facebook": {
    label: "Scrape Facebook",
    description: "Scrape content from a Facebook page or group on a schedule.",
    paramsSchema: scrapeFacebookParamsSchema as z.ZodType<
      Record<string, unknown>
    >,
    defaultParams: SCRAPE_FACEBOOK_DEFAULT_PARAMS,
    execute: executeScrapeFacebook,
    completesAsynchronously: true,
  },
  "scrape-website": {
    label: "Scrape website",
    description: "Scrape content from a website on a schedule.",
    paramsSchema: scrapeWebsiteParamsSchema as z.ZodType<
      Record<string, unknown>
    >,
    defaultParams: SCRAPE_WEBSITE_DEFAULT_PARAMS,
    execute: executeScrapeWebsite,
    completesAsynchronously: false,
  },
} as const satisfies Record<SchedulableJobType, JobHandlerConfig>;

export const SCHEDULABLE_JOB_TYPES = Object.entries(JOB_HANDLERS).map(
  ([value, config]) => ({
    value: value as SchedulableJobType,
    label: config.label,
    description: config.description,
  }),
);

export function getJobHandler(jobType: SchedulableJobType): JobHandlerConfig {
  return JOB_HANDLERS[jobType];
}

export function getDefaultJobParams(
  jobType: SchedulableJobType,
): Record<string, unknown> {
  return { ...getJobHandler(jobType).defaultParams };
}

export function parseJobParams(
  jobType: SchedulableJobType,
  params: unknown,
): Record<string, unknown> {
  return getJobHandler(jobType).paramsSchema.parse(params);
}

export function safeParseJobParams(jobType: SchedulableJobType, params: unknown) {
  return getJobHandler(jobType).paramsSchema.safeParse(params);
}
