export type BrightDataScraperError = {
  code: string;
  message: string;
  retryable: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isBrightDataScraperErrorItem(value: unknown): boolean {
  const record = asRecord(value);
  if (!record) {
    return false;
  }

  return (
    typeof record.error === "string" || typeof record.error_code === "string"
  );
}

function toBrightDataScraperError(
  item: Record<string, unknown>,
): BrightDataScraperError {
  const message =
    typeof item.error === "string" && item.error.trim().length > 0
      ? item.error.trim()
      : "Bright Data scraper failed.";

  const errorCode =
    typeof item.error_code === "string" && item.error_code.trim().length > 0
      ? item.error_code.trim()
      : null;

  return {
    code: errorCode
      ? `ERR_BRIGHT_DATA_${errorCode.toUpperCase()}`
      : "ERR_BRIGHT_DATA_SCRAPER_FAILED",
    message,
    retryable: false,
  };
}

export type ParseBrightDataScraperWebhookPayloadResult =
  | { kind: "error"; error: BrightDataScraperError }
  | { kind: "success"; output: unknown };

export function parseBrightDataScraperWebhookPayload(
  payload: unknown,
): ParseBrightDataScraperWebhookPayloadResult {
  if (!Array.isArray(payload)) {
    return { kind: "success", output: payload };
  }

  const errorItems = payload.filter(isBrightDataScraperErrorItem);
  if (errorItems.length === 0) {
    return { kind: "success", output: payload };
  }

  const successItems = payload.filter(
    (item) => !isBrightDataScraperErrorItem(item),
  );

  if (successItems.length === 0) {
    const firstError = asRecord(errorItems[0]);
    return {
      kind: "error",
      error: toBrightDataScraperError(firstError ?? {}),
    };
  }

  return { kind: "success", output: successItems };
}
