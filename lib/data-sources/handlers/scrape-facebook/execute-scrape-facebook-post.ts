import { createBrightDataScraperJob } from "@/lib/bright-data/services/create-scraper-job";
import { getBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/get-webhook-authorization";
import { getBrightDataWebhookUrl } from "@/lib/bright-data/utils/get-webhook-url";

import type { SourceHandlerContext } from "../types";

const brightDataFacebookPostDatasetId = "gd_lyclm1571iy3mv57zw";

export type ExecuteScrapeFacebookPostParams = {
  postUrl: string;
  /** Canonical page or group URL of the post's source. */
  sourceOriginKey: string;
};

export async function executeScrapeFacebookPost(
  params: ExecuteScrapeFacebookPostParams,
  context: SourceHandlerContext,
): Promise<{ snapshotId: string }> {
  const { snapshotId } = await createBrightDataScraperJob({
    datasetId: brightDataFacebookPostDatasetId,
    input: [
      {
        url: params.postUrl,
      },
    ],
    webhookUrl: getBrightDataWebhookUrl({ sourceRunId: context.sourceRunId }),
    webhookAuthorization: getBrightDataWebhookAuthorization(),
    includeErrors: true,
  });

  console.log("[scrape-facebook] triggered single-post Bright Data scrape", {
    dataSourceId: context.dataSourceId,
    sourceRunId: context.sourceRunId,
    postUrl: params.postUrl,
    sourceOriginKey: params.sourceOriginKey,
    datasetId: brightDataFacebookPostDatasetId,
    snapshotId,
  });

  return { snapshotId };
}
