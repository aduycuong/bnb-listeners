import type {
  FetchTiktokCommentRepliesPageParams,
  TikHubCursorPage,
} from "../types";
import { parseCursorPage } from "../utils/parse-cursor-page";
import { requestTikHub } from "./request-tikhub";

const DEFAULT_PAGE_SIZE = 20;

/**
 * One page of the replies to a top-level comment. A reply to another reply
 * stays in this list and names its parent in `reply_to_reply_id`.
 */
export async function fetchTiktokCommentRepliesPage(
  params: FetchTiktokCommentRepliesPageParams,
): Promise<TikHubCursorPage> {
  const { data } = await requestTikHub({
    endpoint: "app/v3/fetch_video_comment_replies",
    query: {
      item_id: params.videoId,
      comment_id: params.commentId,
      cursor: params.cursor ?? "0",
      count: params.count ?? DEFAULT_PAGE_SIZE,
    },
    client: params.client,
  });

  return parseCursorPage(data, "comments");
}
