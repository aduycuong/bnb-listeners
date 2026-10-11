import { COLLECT_WAIT_TIMEOUT_SECONDS } from "../constants";

/**
 * Seconds each wait step listens for the webhook. Local dev can lower it with
 * COLLECT_WAIT_TIMEOUT_SECONDS, since Bright Data cannot reach localhost and
 * every run there finishes through polling.
 */
export function getCollectWaitTimeoutSeconds(): number {
  const parsed = Number.parseInt(
    process.env.COLLECT_WAIT_TIMEOUT_SECONDS ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : COLLECT_WAIT_TIMEOUT_SECONDS;
}
