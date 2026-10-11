import { z } from "zod";

import { APIError } from "@/lib/exposers/api-error";

import type {
  GetBrightDataSnapshotProgressParams,
  GetBrightDataSnapshotProgressResult,
} from "../types";
import { getBrightDataApiToken } from "../utils/get-bright-data-api-token";

const progressResponseSchema = z.object({
  status: z.string(),
  records: z.number().optional(),
  errors: z.number().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
});

/** `starting` and `running` both mean the snapshot is still being collected. */
export async function getBrightDataSnapshotProgress(
  params: GetBrightDataSnapshotProgressParams,
): Promise<GetBrightDataSnapshotProgressResult> {
  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/progress/${encodeURIComponent(params.snapshotId)}`,
    { headers: { Authorization: `Bearer ${getBrightDataApiToken()}` } },
  );

  if (!response.ok) {
    throw new APIError(
      "ERR_BRIGHT_DATA_REQUEST_FAILED",
      `Bright Data progress request failed (${response.status} ${response.statusText}): ${await response.text()}`,
      502,
    );
  }

  const parsed = progressResponseSchema.parse(await response.json());
  const status =
    parsed.status === "ready"
      ? "ready"
      : parsed.status === "failed"
        ? "failed"
        : "running";

  return {
    status,
    records: parsed.records ?? null,
    error:
      status === "failed"
        ? (parsed.error ?? parsed.error_code ?? "Bright Data snapshot failed.")
        : null,
  };
}
