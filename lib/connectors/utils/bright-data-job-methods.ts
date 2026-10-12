import { createBrightDataScraperJob } from "@/lib/bright-data/services/create-scraper-job";
import { getBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/get-webhook-authorization";
import { APIError } from "@/lib/exposers/api-error";

type StartBrightDataCollectJobParams = {
  datasetId: string;
  input: Record<string, unknown>[];
  collectRunId: string;
};

/**
 * Webhook URL on the public app domain. Local dev runs behind a tunnel, so
 * NEXT_PUBLIC_APP_URL is always reachable by Bright Data.
 */
function getCollectRunWebhookUrl(collectRunId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (!appUrl) {
    throw new APIError(
      "ERR_APP_URL_NOT_CONFIGURED",
      "NEXT_PUBLIC_APP_URL must be set to create Bright Data webhooks.",
      503,
    );
  }

  return `${appUrl}/api/webhooks/connectors/bright-data/${collectRunId}`;
}

/** Shared Bright Data plumbing for job connectors; results arrive via webhook. */
export const brightDataJobMethods = {
  async start(params: StartBrightDataCollectJobParams): Promise<string> {
    const { snapshotId } = await createBrightDataScraperJob({
      datasetId: params.datasetId,
      input: params.input,
      webhookUrl: getCollectRunWebhookUrl(params.collectRunId),
      webhookAuthorization: getBrightDataWebhookAuthorization(),
      includeErrors: true,
    });

    return snapshotId;
  },
};
