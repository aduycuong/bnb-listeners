import { setTimeout as sleep } from "node:timers/promises";

import { APIError } from "@/lib/exposers/api-error";

import type { RequestTikHubParams, RequestTikHubResult } from "../types";
import { recordTikHubRequest } from "../utils/count-tikhub-requests";
import { getTikHubApiKey } from "../utils/get-tikhub-api-key";

const TIKHUB_BASE_URL = "https://api.tikhub.io/api/v1/tiktok";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function readEnvelope(body: unknown): { detail: unknown; requestId: string | null; data: unknown } {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const detail = record.detail ?? null;
  const detailRecord =
    detail && typeof detail === "object" ? (detail as Record<string, unknown>) : null;
  const requestId = record.request_id ?? detailRecord?.request_id;

  return {
    detail,
    requestId: typeof requestId === "string" ? requestId : null,
    data: record.data,
  };
}

function describeError(body: unknown): string {
  const { detail } = readEnvelope(body);
  const message =
    detail && typeof detail === "object"
      ? (detail as Record<string, unknown>).message
      : undefined;

  return typeof message === "string" ? message : JSON.stringify(body).slice(0, 300);
}

/**
 * One TikHub request. 429 and 5xx are retried with a doubling delay; every other
 * failure is final, since a retry cannot fix it (no balance, bad key, bad input)
 * and each request is billed.
 */
export async function requestTikHub(
  params: RequestTikHubParams,
): Promise<RequestTikHubResult> {
  const apiKey = getTikHubApiKey();
  const fetchImpl = params.client?.fetchImpl ?? fetch;
  const maxAttempts = params.client?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = params.client?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const url = new URL(`${TIKHUB_BASE_URL}/${params.endpoint}`);
  for (const [key, value] of Object.entries(params.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  for (let attempt = 1; ; attempt++) {
    let response: Response | null = null;

    try {
      response = await fetchImpl(url, {
        method: params.method ?? "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: params.body === undefined ? undefined : JSON.stringify(params.body),
      });
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw new APIError(
          "ERR_TIKHUB_REQUEST_FAILED",
          `TikHub ${params.endpoint} failed: ${error instanceof Error ? error.message : "network error"}`,
          502,
        );
      }
    }

    if (response && !isRetryableStatus(response.status)) {
      return handleResponse(params.endpoint, response);
    }

    if (response && attempt >= maxAttempts) {
      throw new APIError(
        "ERR_TIKHUB_REQUEST_FAILED",
        `TikHub ${params.endpoint} failed (${response.status}) after ${attempt} attempts.`,
        502,
      );
    }

    await sleep(baseDelayMs * 2 ** (attempt - 1));
  }
}

async function handleResponse(
  endpoint: string,
  response: Response,
): Promise<RequestTikHubResult> {
  const text = await response.text();
  let body: unknown;

  try {
    body = JSON.parse(text);
  } catch {
    throw new APIError(
      "ERR_TIKHUB_INVALID_RESPONSE",
      `TikHub ${endpoint} returned non-JSON (${response.status}).`,
      502,
    );
  }

  if (response.status === 402) {
    throw new APIError(
      "ERR_TIKHUB_INSUFFICIENT_BALANCE",
      `TikHub balance is too low for ${endpoint}: ${describeError(body)}`,
      502,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new APIError(
      "ERR_TIKHUB_UNAUTHORIZED",
      `TikHub rejected the API key for ${endpoint}.`,
      502,
    );
  }

  if (!response.ok) {
    throw new APIError(
      "ERR_TIKHUB_REQUEST_FAILED",
      `TikHub ${endpoint} failed (${response.status}): ${describeError(body)}`,
      502,
    );
  }

  recordTikHubRequest();
  const envelope = readEnvelope(body);
  return { data: envelope.data, requestId: envelope.requestId };
}
