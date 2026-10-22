import type {
  FetchTiktokVideoCommentsPageParams,
  TikHubCursorPage,
} from "../types";
import { parseCursorPage } from "../utils/parse-cursor-page";
import { requestTikHub } from "./request-tikhub";

const DEFAULT_PAGE_SIZE = 20;

/**
 * One page of a video's top-level comments. The order cannot be chosen. Replies
 * are not included; `reply_comment_total` says how many a comment has.
 */
export async function fetchTiktokVideoCommentsPage(
  params: FetchTiktokVideoCommentsPageParams,
): Promise<TikHubCursorPage> {
  const { data } = await requestTikHub({
    endpoint: "app/v3/fetch_video_comments",
    query: {
      aweme_id: params.videoId,
      cursor: params.cursor ?? "0",
      count: params.count ?? DEFAULT_PAGE_SIZE,
    },
    client: params.client,
  });

  return parseCursorPage(data, "comments");
}
