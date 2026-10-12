/**
 * Public origin QStash calls back to. Behind a tunnel the request reaches Next
 * as `localhost`, which QStash refuses, so the SDK must not infer it from the
 * request. `UPSTASH_WORKFLOW_URL` overrides the app URL when they differ.
 */
export function getWorkflowBaseUrl(): string {
  const baseUrl = (
    process.env.UPSTASH_WORKFLOW_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  )?.replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error(
      "UPSTASH_WORKFLOW_URL or NEXT_PUBLIC_APP_URL environment variable must be set",
    );
  }

  return baseUrl;
}
