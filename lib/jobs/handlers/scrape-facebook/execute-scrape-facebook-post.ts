import { createBrightDataScraperJob } from "@/lib/bright-data/services/create-scraper-job";
import { getBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/get-webhook-authorization";
import { getBrightDataWebhookUrl } from "@/lib/bright-data/utils/get-webhook-url";

import type { JobHandlerContext } from "../types";

const brightDataFacebookPostDatasetId = "gd_lyclm1571iy3mv57zw";

export type ExecuteScrapeFacebookPostParams = {
  postUrl: string;
  /** Canonical page or group URL of the post's source. */
  sourceKey: string;
};

export async function executeScrapeFacebookPost(
  params: ExecuteScrapeFacebookPostParams,
  context: JobHandlerContext,
): Promise<{ snapshotId: string }> {
  const { snapshotId } = await createBrightDataScraperJob({
    datasetId: brightDataFacebookPostDatasetId,
    input: [
      {
        url: params.postUrl,
      },
    ],
    webhookUrl: getBrightDataWebhookUrl({ jobRunId: context.jobRunId }),
    webhookAuthorization: getBrightDataWebhookAuthorization(),
    includeErrors: true,
  });

  console.log("[scrape-facebook] triggered single-post Bright Data scrape", {
    jobId: context.jobId,
    jobRunId: context.jobRunId,
    postUrl: params.postUrl,
    sourceKey: params.sourceKey,
    datasetId: brightDataFacebookPostDatasetId,
    snapshotId,
  });

  return { snapshotId };
}
