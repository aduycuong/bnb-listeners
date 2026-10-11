import { APIError } from "@/lib/exposers/api-error";

export function getBrightDataApiToken(): string {
  const apiToken = process.env.BRIGHT_DATA_API_TOKEN;

  if (!apiToken) {
    throw new APIError(
      "ERR_BRIGHT_DATA_NOT_CONFIGURED",
      "Missing BRIGHT_DATA_API_TOKEN.",
      503,
    );
  }

  return apiToken;
}
