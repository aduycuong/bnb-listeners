import type {
  FetchTiktokUserPostsPageParams,
  TikHubCursorPage,
} from "../types";
import { parseCursorPage } from "../utils/parse-cursor-page";
import { requestTikHub } from "./request-tikhub";

const DEFAULT_PAGE_SIZE = 20;

/**
 * One page of a channel's videos, newest first. The cursor is the publish time
 * (ms) of the page's last video and that video repeats as the next page's first,
 * so callers de-duplicate by id. Needs the `secUid` of the channel.
 */
export async function fetchTiktokUserPostsPage(
  params: FetchTiktokUserPostsPageParams,
): Promise<TikHubCursorPage> {
  const { data } = await requestTikHub({
    endpoint: "web/fetch_user_post",
    query: {
      secUid: params.secUid,
      cursor: params.cursor ?? "0",
      count: params.count ?? DEFAULT_PAGE_SIZE,
    },
    client: params.client,
  });

  return parseCursorPage(data, "itemList");
}
