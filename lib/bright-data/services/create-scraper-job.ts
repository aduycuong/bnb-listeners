import { z } from "zod";

import { APIError } from "@/lib/exposers/api-error";

import type {
  CreateBrightDataScraperJobParams,
  CreateBrightDataScraperJobResult,
} from "../types";

const brightDataTriggerEndpoint =
  "https://api.brightdata.com/datasets/v3/trigger";

const triggerResponseSchema = z.object({
  snapshot_id: z.string().min(1),
});

export async function createBrightDataScraperJob(
  params: CreateBrightDataScraperJobParams
): Promise<CreateBrightDataScraperJobResult> {
  const apiToken = process.env.BRIGHT_DATA_API_TOKEN;

  if (!apiToken) {
    throw new APIError(
      "ERR_BRIGHT_DATA_NOT_CONFIGURED",
      "Missing BRIGHT_DATA_API_TOKEN.",
      503
    );
  }

  const requestUrl = new URL(brightDataTriggerEndpoint);
  requestUrl.searchParams.set("dataset_id", params.datasetId);
  requestUrl.searchParams.set("format", "json");
  requestUrl.searchParams.set("notify", "false");
  requestUrl.searchParams.set("endpoint", params.webhookUrl);
  requestUrl.searchParams.set("auth_header", params.webhookAuthorization);
  requestUrl.searchParams.set("force_deliver", "false");
  requestUrl.searchParams.set("uncompressed_webhook", "true");
  requestUrl.searchParams.set(
    "include_errors",
    String(params.includeErrors ?? true)
  );

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.input),
  });

  const responseText = await response.text();
  let json: unknown;

  try {
    json = JSON.parse(responseText); // {"snapshot_id": "1234567890"}
  } catch {
    throw new APIError(
      "ERR_BRIGHT_DATA_INVALID_RESPONSE",
      `Bright Data returned non-JSON response (${response.status} ${response.statusText}).`,
      502
    );
  }

  if (!response.ok) {
    throw new APIError(
      "ERR_BRIGHT_DATA_REQUEST_FAILED",
      `Bright Data request failed (${response.status} ${response.statusText}): ${JSON.stringify(json)}`,
      502
    );
  }

  const parsed = triggerResponseSchema.parse(json);

  return { snapshotId: parsed.snapshot_id };
}
