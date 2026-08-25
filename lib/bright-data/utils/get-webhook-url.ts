import { APIError } from "@/lib/exposers/api-error";

type GetBrightDataWebhookUrlParams = {
  jobRunId: string;
};

export function getBrightDataWebhookUrl(
  params: GetBrightDataWebhookUrlParams,
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!appUrl) {
    throw new APIError(
      "ERR_APP_URL_NOT_CONFIGURED",
      "NEXT_PUBLIC_APP_URL must be set to create Bright Data webhooks.",
      503,
    );
  }

  return `${appUrl}/api/webhooks/bright-data/${params.jobRunId}`;
}
