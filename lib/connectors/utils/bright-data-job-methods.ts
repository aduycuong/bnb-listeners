import { downloadBrightDataSnapshot } from "@/lib/bright-data/services/download-snapshot";
import { getBrightDataSnapshotProgress } from "@/lib/bright-data/services/get-snapshot-progress";
import { createBrightDataScraperJob } from "@/lib/bright-data/services/create-scraper-job";
import { getBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/get-webhook-authorization";
import { APIError } from "@/lib/exposers/api-error";

import type { JobConnector, JobStatus } from "../types";

type StartBrightDataCollectJobParams = {
  datasetId: string;
  input: Record<string, unknown>[];
  collectRunId: string;
};

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

/**
 * Shared Bright Data plumbing for job connectors. Results are delivered to the
 * collect-run webhook; when it never arrives (local dev, lost delivery) the
 * workflow polls progress and downloads the snapshot itself.
 */
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

  async getJobStatus(externalJobId: string): Promise<JobStatus> {
    const progress = await getBrightDataSnapshotProgress({
      snapshotId: externalJobId,
    });

    if (progress.status === "failed") {
      return { state: "failed", error: progress.error ?? "Snapshot failed." };
    }

    return { state: progress.status };
  },

  async downloadJobResult(externalJobId: string): Promise<string | null> {
    const result = await downloadBrightDataSnapshot({ snapshotId: externalJobId });
    return result.ready ? result.body : null;
  },
} satisfies Pick<JobConnector<unknown>, "getJobStatus" | "downloadJobResult"> & {
  start: (params: StartBrightDataCollectJobParams) => Promise<string>;
};
