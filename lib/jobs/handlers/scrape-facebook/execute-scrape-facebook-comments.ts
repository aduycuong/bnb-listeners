import { createBrightDataScraperJob } from "@/lib/bright-data/services/create-scraper-job";
import { getBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/get-webhook-authorization";
import { getBrightDataWebhookUrl } from "@/lib/bright-data/utils/get-webhook-url";

import type { JobHandlerContext } from "../types";

export const brightDataFacebookCommentsDatasetId = "gd_lkay758p1eanlolqw8";

const defaultLimitRecords = 100;

export type ExecuteScrapeFacebookCommentsParams = {
  postUrl: string;
  limitRecords?: number;
};

export async function executeScrapeFacebookComments(
  params: ExecuteScrapeFacebookCommentsParams,
  context: JobHandlerContext,
): Promise<{ snapshotId: string }> {
  const { snapshotId } = await createBrightDataScraperJob({
    datasetId: brightDataFacebookCommentsDatasetId,
    input: [
      {
        url: params.postUrl,
        get_all_replies: true,
        limit_records: params.limitRecords ?? defaultLimitRecords,
        comments_sort: "Most relevant",
      },
    ],
    webhookUrl: getBrightDataWebhookUrl({ jobRunId: context.jobRunId }),
    webhookAuthorization: getBrightDataWebhookAuthorization(),
    includeErrors: true,
  });

  console.log("[scrape-facebook] triggered Bright Data comments scrape", {
    jobId: context.jobId,
    jobRunId: context.jobRunId,
    postUrl: params.postUrl,
    datasetId: brightDataFacebookCommentsDatasetId,
    snapshotId,
  });

  return { snapshotId };
}
