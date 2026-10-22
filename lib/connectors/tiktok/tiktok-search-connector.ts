import { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { COLLECT_CONFIG } from "../config";
import { createItemRefreshSchedules } from "../services/create-item-refresh-schedules";
import type { DirectConnector, NormalizeResult } from "../types";
import { tiktokAwemeSchema } from "./schema";
import { attachTiktokTranscripts } from "./services/attach-tiktok-transcripts";
import { scanTiktokSearch } from "./services/scan-tiktok-search";
import { toTiktokAwemeContentItem } from "./utils/to-tiktok-aweme-content-item";

export const tiktokSearchParamsSchema = z.object({
  keyword: z.string().trim().min(1),
  region: z.string().trim().length(2).default(COLLECT_CONFIG.tiktok.search.region),
  /** Publish-time window in days; TikHub offers 1, 7, 30, 90 and 180, and 0 for no window. */
  publishTimeDays: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(7),
      z.literal(30),
      z.literal(90),
      z.literal(180),
    ])
    .default(COLLECT_CONFIG.tiktok.search.publishTimeDays),
  pages: z.int().min(1).max(10).default(COLLECT_CONFIG.tiktok.search.pagesPerRun),
  /** Hard cap on collected videos. */
  maxRecords: z.int().min(1).max(500).default(200),
});

export type TiktokSearchParams = z.infer<typeof tiktokSearchParamsSchema>;

/**
 * Videos found by a keyword in the last publish-time window. TikHub ranks them
 * by relevance and each call returns a different sample, so a run is not a
 * complete list: the scheduler runs it every few hours and known videos are
 * skipped. The item source is the search source, so a project follows a
 * keyword by following that source.
 */
export const tiktokSearchConnector: DirectConnector<TiktokSearchParams> = {
  key: "tiktok-search",
  platform: "tiktok",
  mode: "direct",
  paramsSchema: tiktokSearchParamsSchema,
  onExisting: "skip",

  async fetchRecords(params) {
    const deadlineAt = Date.now() + COLLECT_CONFIG.tiktok.runBudgetMs;
    const scan = await scanTiktokSearch({
      keyword: params.keyword,
      region: params.region,
      publishTimeDays: params.publishTimeDays,
      pages: params.pages,
      pageSize: COLLECT_CONFIG.tiktok.pageSize,
      maxRecords: params.maxRecords,
      deadlineAt,
    });
    const transcripts = await attachTiktokTranscripts({ records: scan.records, deadlineAt });

    return {
      records: scan.records,
      stats: {
        requests: scan.requests,
        pageSizes: scan.pageSizes,
        duplicates: scan.duplicates,
        transcripts,
      },
    };
  },

  normalize(records, params): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    const region = params.region.toUpperCase();
    let skipped = 0;

    for (const record of records) {
      const parsed = tiktokAwemeSchema.safeParse(record);

      if (!parsed.success) {
        skipped++;
        continue;
      }

      // `region` only biases TikHub's ranking: a quiet keyword gets filled up
      // with videos from other countries. A video without a region is kept.
      const videoRegion = parsed.data.region?.toUpperCase();
      if (videoRegion && videoRegion !== region) {
        skipped++;
        continue;
      }

      items.push(toTiktokAwemeContentItem(parsed.data));
    }

    // No source details: the source is the search, not a channel.
    return { items, skipped };
  },

  async afterNormalize(context) {
    const { followUps, ...scheduleStats } = await createItemRefreshSchedules({
      collectRunId: context.collectRunId,
    });

    return { stats: scheduleStats, followUps };
  },
};
