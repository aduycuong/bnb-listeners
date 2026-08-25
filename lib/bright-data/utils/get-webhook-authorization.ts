import { APIError } from "@/lib/exposers/api-error";

export function getBrightDataWebhookAuthorization(): string {
  const authorization = process.env.BRIGHT_DATA_WEBHOOK_AUTHORIZATION;

  if (!authorization) {
    throw new APIError(
      "ERR_BRIGHT_DATA_WEBHOOK_NOT_CONFIGURED",
      "Missing BRIGHT_DATA_WEBHOOK_AUTHORIZATION.",
      503
    );
  }

  return authorization;
}
