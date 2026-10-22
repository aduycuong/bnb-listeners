import { fetchTiktokUserPostsPage } from "@/lib/tikhub/services/fetch-tiktok-user-posts-page";

import { assertWithinRunBudget } from "../utils/assert-within-run-budget";

type ScanTiktokChannelParams = {
  secUid: string;
  /** Only videos published at or after this instant are kept. */
  since: Date;
  maxPages: number;
  maxRecords: number;
  pageSize?: number;
  deadlineAt?: number;
  fetchPage?: typeof fetchTiktokUserPostsPage;
  now?: () => number;
};

export type ScanTiktokChannelResult = {
  /** Raw TikHub items of the window, newest first, one per video. */
  records: Record<string, unknown>[];
  requests: number;
  stoppedBy: "reachedSince" | "noMore" | "maxPages" | "maxRecords";
  /** True when `maxRecords` cut videos of the window off. */
  truncated: boolean;
};

function readPublishedAtMs(item: Record<string, unknown>): number | null {
  const seconds = item.createTime;
  return typeof seconds === "number" && seconds > 0 ? seconds * 1000 : null;
}

/**
 * Pages a channel's videos newest first and keeps those inside the window.
 * The scan stops after the first page whose last video is older than `since`.
 * A video repeats across a page boundary, so ids are de-duplicated.
 *
 * Any failure aborts the scan: a later run starts from the newest stored
 * video, so keeping only the newest pages would lose the older ones for good.
 */
export async function scanTiktokChannel(
  params: ScanTiktokChannelParams,
): Promise<ScanTiktokChannelResult> {
  const fetchPage = params.fetchPage ?? fetchTiktokUserPostsPage;
  const sinceMs = params.since.getTime();
  const records: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  let cursor: string | null = null;
  let requests = 0;

  for (let page = 0; page < params.maxPages; page++) {
    assertWithinRunBudget(params.deadlineAt, params.now);
    const result = await fetchPage({
      secUid: params.secUid,
      cursor,
      count: params.pageSize,
    });
    requests++;

    for (const item of result.items) {
      const id = typeof item.id === "string" ? item.id : null;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const publishedAtMs = readPublishedAtMs(item);
      if (publishedAtMs !== null && publishedAtMs < sinceMs) continue;

      if (records.length >= params.maxRecords) {
        return { records, requests, stoppedBy: "maxRecords", truncated: true };
      }
      records.push(item);
    }

    // The page's last video is its oldest, so the window ends on this page when
    // that one is older than `since`. Judging by any video would let a pinned
    // old one at the top of the first page end the scan.
    const lastPublishedAtMs = result.items
      .map(readPublishedAtMs)
      .filter((ms): ms is number => ms !== null)
      .at(-1);

    if (lastPublishedAtMs !== undefined && lastPublishedAtMs < sinceMs) {
      return { records, requests, stoppedBy: "reachedSince", truncated: false };
    }

    if (records.length >= params.maxRecords) {
      return {
        records,
        requests,
        stoppedBy: "maxRecords",
        truncated: result.hasMore,
      };
    }

    // A repeated cursor would loop forever.
    if (!result.hasMore || !result.cursor || result.cursor === cursor) {
      return { records, requests, stoppedBy: "noMore", truncated: false };
    }

    cursor = result.cursor;
  }

  return { records, requests, stoppedBy: "maxPages", truncated: true };
}
