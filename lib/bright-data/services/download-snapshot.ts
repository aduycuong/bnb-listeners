import { APIError } from "@/lib/exposers/api-error";

import type {
  DownloadBrightDataSnapshotParams,
  DownloadBrightDataSnapshotResult,
} from "../types";
import { getBrightDataApiToken } from "../utils/get-bright-data-api-token";

/**
 * Downloads a finished snapshot as JSON. Bright Data answers 202 while the
 * snapshot is still building; that is reported as `ready: false`.
 */
export async function downloadBrightDataSnapshot(
  params: DownloadBrightDataSnapshotParams,
): Promise<DownloadBrightDataSnapshotResult> {
  const url = new URL(
    `https://api.brightdata.com/datasets/v3/snapshot/${encodeURIComponent(params.snapshotId)}`,
  );
  url.searchParams.set("format", "json");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getBrightDataApiToken()}` },
  });

  if (response.status === 202) {
    return { ready: false };
  }

  if (!response.ok) {
    throw new APIError(
      "ERR_BRIGHT_DATA_REQUEST_FAILED",
      `Bright Data snapshot download failed (${response.status} ${response.statusText}): ${await response.text()}`,
      502,
    );
  }

  return { ready: true, body: await response.text() };
}
