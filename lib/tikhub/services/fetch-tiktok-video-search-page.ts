import type {
  FetchTiktokVideoSearchPageParams,
  TikHubCursorPage,
} from "../types";
import { parseCursorPage } from "../utils/parse-cursor-page";
import { requestTikHub } from "./request-tikhub";

const DEFAULT_PAGE_SIZE = 20;

/**
 * One page of keyword search results inside a publish-time window. Each result
 * wraps the video in `aweme_info`; entries without one (cards, ads) are dropped.
 *
 * The window is the only recency control: results are ranked by relevance (or
 * likes), a call returns a different sample each time, and an empty page does
 * not mean the end (probes of 2026-10-22), so callers fetch a fixed number of
 * pages and de-duplicate by id.
 */
export async function fetchTiktokVideoSearchPage(
  params: FetchTiktokVideoSearchPageParams,
): Promise<TikHubCursorPage> {
  const { data } = await requestTikHub({
    endpoint: "app/v3/fetch_video_search_result",
    query: {
      keyword: params.keyword,
      offset: params.offset ?? 0,
      count: params.count ?? DEFAULT_PAGE_SIZE,
      sort_type: params.sortType ?? 0,
      publish_time: params.publishTime ?? 1,
      region: (params.region ?? "VN").toUpperCase(),
    },
    client: params.client,
  });

  const page = parseCursorPage(data, "search_item_list");

  return {
    ...page,
    items: page.items.flatMap((item) => {
      const video = item.aweme_info;
      return video && typeof video === "object" && !Array.isArray(video)
        ? [video as Record<string, unknown>]
        : [];
    }),
  };
}
