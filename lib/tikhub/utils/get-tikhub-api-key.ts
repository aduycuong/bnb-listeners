import { APIError } from "@/lib/exposers/api-error";

export function getTikHubApiKey(): string {
  const apiKey = process.env.TIKHUB_API_KEY?.trim();

  if (!apiKey) {
    throw new APIError(
      "ERR_TIKHUB_NOT_CONFIGURED",
      "Missing TIKHUB_API_KEY.",
      503,
    );
  }

  return apiKey;
}
