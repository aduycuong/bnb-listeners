import { z } from "zod";

import type { SourceHandlerContext } from "./types";

/** Placeholder params until website scrape is implemented. */
export const scrapeWebsiteParamsSchema = z.object({});

export type ScrapeWebsiteParams = z.infer<typeof scrapeWebsiteParamsSchema>;

export const SCRAPE_WEBSITE_DEFAULT_PARAMS: ScrapeWebsiteParams = {};

export async function executeScrapeWebsite(
  _params: Record<string, unknown>,
  _context: SourceHandlerContext,
): Promise<void> {
  // Intentionally empty.
}
