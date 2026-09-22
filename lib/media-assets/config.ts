/** Abort a media download that takes longer than this. */
export const MEDIA_DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * How many times to attempt a download. Facebook CDN hosts often reset the
 * first TCP/TLS connection (`TypeError: fetch failed`); later attempts on
 * the same host succeed.
 */
export const MEDIA_DOWNLOAD_ATTEMPTS = 3;

/** Backoff between retryable download attempts, one entry per retry. */
export const MEDIA_DOWNLOAD_RETRY_DELAYS_MS = [250, 800] as const;

/** Size caps per media kind. Larger files are rejected before upload. */
export const MEDIA_MAX_BYTES = {
  image: 15 * 1024 * 1024,
  video: 100 * 1024 * 1024,
} as const;

/** Object key prefix inside the R2 bucket for archived document media. */
export const MEDIA_OBJECT_KEY_PREFIX = "documents";

/**
 * Browser-like headers — several social CDNs return 403 to the default
 * Node fetch user agent.
 */
export const MEDIA_DOWNLOAD_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "image/*,video/*,*/*;q=0.8",
};
