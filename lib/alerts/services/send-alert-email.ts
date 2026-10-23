const RESEND_URL = "https://api.resend.com/emails";

/**
 * Send one plain-text alert through Resend. Zalo, SMS and Slack are not handled here.
 * Throws when the key, the from-address, or the API call fails.
 */
export async function sendAlertEmail(input: {
  to: string[];
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ALERT_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("Chưa cấu hình RESEND_API_KEY hoặc ALERT_EMAIL_FROM.");
  }
  if (input.to.length === 0) {
    throw new Error("Chưa có email nhận cảnh báo.");
  }

  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Gửi email thất bại (${response.status}). ${detail}`.trim());
  }
}
