import type { z } from "zod";

import type { SourceType } from "../constants";
import {
  SOURCE_RUN_TYPE_FACEBOOK_POSTS,
  SOURCE_RUN_TYPE_SCRAPE_WEBSITE,
  type SourceRunType,
} from "../source-run-types";
import type { SourceHandlerContext } from "./types";
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

export type SourceHandlerConfig = {
  label: string;
  description: string;
  paramsSchema: z.ZodType<Record<string, unknown>>;
  defaultParams: Record<string, unknown>;
  defaultRunType: SourceRunType;
  execute: (
    params: Record<string, unknown>,
    context: SourceHandlerContext,
  ) => Promise<void>;
  /**
   * When true, `job_runs` stays `running` after execute returns.
   * Another path (for example a Bright Data webhook) must complete the run.
   */
  completesAsynchronously?: boolean;
};

export const SOURCE_HANDLERS = {
  "scrape-facebook": {
    label: "Scrape Facebook",
    description: "Scrape content from a Facebook page or group on a schedule.",
    paramsSchema: scrapeFacebookParamsSchema as z.ZodType<
      Record<string, unknown>
    >,
    defaultParams: SCRAPE_FACEBOOK_DEFAULT_PARAMS,
    defaultRunType: SOURCE_RUN_TYPE_FACEBOOK_POSTS,
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
    defaultRunType: SOURCE_RUN_TYPE_SCRAPE_WEBSITE,
    execute: executeScrapeWebsite,
    completesAsynchronously: false,
  },
} as const satisfies Record<SourceType, SourceHandlerConfig>;

export const SOURCE_TYPES = Object.entries(SOURCE_HANDLERS).map(
  ([value, config]) => ({
    value: value as SourceType,
    label: config.label,
    description: config.description,
  }),
);

export function getSourceHandler(sourceType: SourceType): SourceHandlerConfig {
  return SOURCE_HANDLERS[sourceType];
}

export function getDefaultSourceParams(
  sourceType: SourceType,
): Record<string, unknown> {
  return { ...getSourceHandler(sourceType).defaultParams };
}

export function parseSourceParams(
  sourceType: SourceType,
  params: unknown,
): Record<string, unknown> {
  return getSourceHandler(sourceType).paramsSchema.parse(params);
}

export function safeParseSourceParams(sourceType: SourceType, params: unknown) {
  return getSourceHandler(sourceType).paramsSchema.safeParse(params);
}
