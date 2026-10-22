import { APIError } from "@/lib/exposers/api-error";

import type { FetchTiktokVideosParams } from "../types";
import { requestTikHub } from "./request-tikhub";

/** Probed with 2 ids only; raise it once a larger batch has been measured. */
export const TIKHUB_MAX_VIDEOS_PER_REQUEST = 20;

/**
 * Current details and counters of known videos, one request for the batch.
 * Videos TikTok no longer serves are missing from the result.
 */
export async function fetchTiktokVideos(
  params: FetchTiktokVideosParams,
): Promise<Record<string, unknown>[]> {
  if (params.videoIds.length === 0) return [];

  if (params.videoIds.length > TIKHUB_MAX_VIDEOS_PER_REQUEST) {
    throw new APIError(
      "ERR_TIKHUB_BATCH_TOO_LARGE",
      `At most ${TIKHUB_MAX_VIDEOS_PER_REQUEST} videos per request, got ${params.videoIds.length}.`,
      400,
    );
  }

  const { data } = await requestTikHub({
    endpoint: "app/v3/fetch_multi_video",
    method: "POST",
    body: params.videoIds,
    client: params.client,
  });

  return Array.isArray(data)
    ? data.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}
