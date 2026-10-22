import { fetchTiktokVideoSearchPage } from "@/lib/tikhub/services/fetch-tiktok-video-search-page";

import { assertWithinRunBudget } from "../utils/assert-within-run-budget";

type ScanTiktokSearchParams = {
  keyword: string;
  region: string;
  /** Days: the publish-time window of the search; 0 is no window. */
  publishTimeDays: 0 | 1 | 7 | 30 | 90 | 180;
  /** Pages to fetch whatever they return. */
  pages: number;
  pageSize: number;
  maxRecords: number;
  deadlineAt?: number;
  fetchPage?: typeof fetchTiktokVideoSearchPage;
  now?: () => number;
};

export type ScanTiktokSearchResult = {
  /** Raw TikHub videos (`aweme_info`), one per video. */
  records: Record<string, unknown>[];
  requests: number;
  /** Videos per page as returned, before de-duplication. */
  pageSizes: number[];
  duplicates: number;
};

/**
 * Fetches a fixed number of search pages. Results are ranked by relevance and
 * each call returns a different sample of the window (probes of 2026-10-22),
 * and an empty page does not mean the end, so there is no early stop: every
 * run reads the same number of pages and later runs fill in the rest.
 *
 * Any failure aborts the scan, like a channel scan.
 */
export async function scanTiktokSearch(
  params: ScanTiktokSearchParams,
): Promise<ScanTiktokSearchResult> {
  const fetchPage = params.fetchPage ?? fetchTiktokVideoSearchPage;
  const records: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const pageSizes: number[] = [];
  let duplicates = 0;
  let requests = 0;

  for (let page = 0; page < params.pages; page++) {
    assertWithinRunBudget(params.deadlineAt, params.now);
    const result = await fetchPage({
      keyword: params.keyword,
      offset: page * params.pageSize,
      count: params.pageSize,
      publishTime: params.publishTimeDays,
      region: params.region,
    });
    requests++;
    pageSizes.push(result.items.length);

    for (const item of result.items) {
      const id = typeof item.aweme_id === "string" ? item.aweme_id : null;
      if (!id) continue;

      if (seen.has(id)) {
        duplicates++;
        continue;
      }
      seen.add(id);

      if (records.length < params.maxRecords) records.push(item);
    }

    if (records.length >= params.maxRecords) break;
  }

  return { records, requests, pageSizes, duplicates };
}
