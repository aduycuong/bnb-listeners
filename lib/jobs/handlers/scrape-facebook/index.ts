import { z } from "zod";

import { createBrightDataScraperJob } from "@/lib/bright-data/services/create-scraper-job";
import { getBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/get-webhook-authorization";
import { getBrightDataWebhookUrl } from "@/lib/bright-data/utils/get-webhook-url";

import type { JobHandlerContext } from "../types";

export type { BrightDataFacebookPost, FacebookPostMetadata } from "./types";

const brightDataFacebookGroupDatasetId = "gd_lz11l67o2cb3r0lkj3";
const brightDataFacebookPageDatasetId = "gd_lkaxegm826bjpoo9m5";
const defaultNumOfPosts = 10;

function isFacebookUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

function isFacebookGroupUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (!host.includes("facebook.com")) return false;

    const path = url.pathname.toLowerCase();
    return path === "/groups" || path.startsWith("/groups/");
  } catch {
    return false;
  }
}

export const scrapeFacebookParamsSchema = z.object({
  facebookUrl: z
    .string()
    .trim()
    .pipe(z.url({ error: "Facebook URL must be a valid URL." }))
    .refine(isFacebookUrl, {
      error: "Facebook URL must be a facebook.com page or group URL.",
    }),
});

export type ScrapeFacebookParams = z.infer<typeof scrapeFacebookParamsSchema>;

export const SCRAPE_FACEBOOK_DEFAULT_PARAMS = {
  facebookUrl: "",
};

export async function executeScrapeFacebook(
  params: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const { facebookUrl } = scrapeFacebookParamsSchema.parse(params);

  const isGroup = isFacebookGroupUrl(facebookUrl);
  const datasetId = isGroup
    ? brightDataFacebookGroupDatasetId
    : brightDataFacebookPageDatasetId;
  const sourceType = isGroup ? "group" : "page";

  const { snapshotId } = await createBrightDataScraperJob({
    datasetId,
    input: [
      {
        url: facebookUrl,
        num_of_posts: defaultNumOfPosts,
        posts_to_not_include: [],
        start_date: "",
        end_date: "",
      },
    ],
    webhookUrl: getBrightDataWebhookUrl({ jobRunId: context.jobRunId }),
    webhookAuthorization: getBrightDataWebhookAuthorization(),
    includeErrors: true,
  });

  console.log("[scrape-facebook] triggered Bright Data scrape", {
    jobId: context.jobId,
    jobRunId: context.jobRunId,
    facebookUrl,
    sourceType,
    datasetId,
    snapshotId,
  });
}
