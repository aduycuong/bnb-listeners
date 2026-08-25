export function getCallbackUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const url =
    process.env.QSTASH_CALLBACK_URL?.trim() ??
    (appUrl ? `${appUrl.replace(/\/$/, "")}/api/qstash/callback` : undefined);

  if (!url) {
    throw new Error(
      "QSTASH_CALLBACK_URL or NEXT_PUBLIC_APP_URL environment variable must be set",
    );
  }

  return url;
}
