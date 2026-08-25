import { timingSafeEqual } from "node:crypto";

export function verifyBrightDataWebhookAuthorization(
  actual: string | null
): boolean {
  const expected = process.env.BRIGHT_DATA_WEBHOOK_AUTHORIZATION;

  if (!expected || !actual) return false;

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
