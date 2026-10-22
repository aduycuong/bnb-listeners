/** Test and tuning hooks of the TikHub client; production calls leave them unset. */
export type TikHubClientOptions = {
  fetchImpl?: typeof fetch;
  /** Total attempts for a retryable failure (429, 5xx, network). Defaults to 3. */
  maxAttempts?: number;
  /** Delay before the first retry, doubled each time. Defaults to 500 ms. */
  retryDelayMs?: number;
};

export type RequestTikHubParams = {
  /** Path under `/api/v1/tiktok/`, e.g. `web/fetch_user_post`. */
  endpoint: string;
  query?: Record<string, string | number | undefined>;
  method?: "GET" | "POST";
  /** JSON body of a POST. */
  body?: unknown;
  client?: TikHubClientOptions;
};

export type RequestTikHubResult = {
  /** The envelope's `data` field, not validated. */
  data: unknown;
  requestId: string | null;
};

/** One page of a cursor-paged list. */
export type TikHubCursorPage = {
  /** Raw items as TikHub returned them; they are archived and validated at normalize time. */
  items: Record<string, unknown>[];
  /** Cursor for the next request; null when the response carries none. */
  cursor: string | null;
  /**
   * The provider's `has_more` flag. Search ignores it: an empty page in the
   * middle of a search is followed by non-empty ones.
   */
  hasMore: boolean;
};

export type TikHubUserProfile = {
  /** Numeric account id; stable when the username changes. */
  id: string;
  uniqueId: string;
  secUid: string;
  nickname: string | null;
  followerCount: number | null;
  avatarUrl: string | null;
  verified: boolean;
};

export type FetchTiktokUserProfileParams = {
  /** Username without `@`. */
  uniqueId: string;
  client?: TikHubClientOptions;
};

export type FetchTiktokUserPostsPageParams = {
  secUid: string;
  /** `null` or omitted for the first page; otherwise the previous page's cursor. */
  cursor?: string | null;
  /** Requested page size; TikHub returns about 15 for 20. */
  count?: number;
  client?: TikHubClientOptions;
};

export type FetchTiktokVideoSearchPageParams = {
  keyword: string;
  offset?: number;
  count?: number;
  /** Days: 0 unlimited, 1, 7, 30, 90 or 180. Defaults to 1 (the last 24 hours). */
  publishTime?: 0 | 1 | 7 | 30 | 90 | 180;
  /** 0 relevance, 1 most likes. There is no "newest" sort. */
  sortType?: 0 | 1;
  /** ISO 3166-1 alpha-2 code. Defaults to `VN`. */
  region?: string;
  client?: TikHubClientOptions;
};

export type FetchTiktokVideosParams = {
  videoIds: string[];
  client?: TikHubClientOptions;
};

export type FetchTiktokVideoCommentsPageParams = {
  videoId: string;
  cursor?: string | null;
  count?: number;
  client?: TikHubClientOptions;
};

export type FetchTiktokCommentRepliesPageParams = {
  videoId: string;
  commentId: string;
  cursor?: string | null;
  count?: number;
  client?: TikHubClientOptions;
};
