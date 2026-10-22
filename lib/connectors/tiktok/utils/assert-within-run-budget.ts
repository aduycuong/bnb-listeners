import { APIError } from "@/lib/exposers/api-error";

/**
 * A TikTok fetch runs inside one workflow step, which has a time limit. Called
 * before every request, this turns "about to run out of time" into a clear
 * failure instead of a step killed halfway.
 */
export function assertWithinRunBudget(
  deadlineAt: number | undefined,
  now: () => number = Date.now,
): void {
  if (deadlineAt !== undefined && now() > deadlineAt) {
    throw new APIError(
      "ERR_TIKTOK_RUN_TIMEOUT",
      "The TikTok fetch ran out of its time budget before it finished.",
      504,
    );
  }
}
