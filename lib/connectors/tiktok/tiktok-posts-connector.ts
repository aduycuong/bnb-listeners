import { z } from "zod";

import { fetchTiktokUserProfile } from "@/lib/tikhub/services/fetch-tiktok-user-profile";
import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { COLLECT_CONFIG } from "../config";
import { afterPostScan } from "../services/after-post-scan";
import type { DirectConnector, NormalizeResult, SourceDetails } from "../types";
import { type TiktokWebPost, tiktokWebPostSchema } from "./schema";
import { attachTiktokTranscripts } from "./services/attach-tiktok-transcripts";
import { scanTiktokChannel } from "./services/scan-tiktok-channel";
import { parseTiktokSourceUrl } from "./utils/parse-tiktok-source-url";
import { toTiktokChannelSourceDetails } from "./utils/to-tiktok-channel-source-details";
import { toTiktokWebPostContentItem } from "./utils/to-tiktok-web-post-content-item";

export const tiktokPostsParamsSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((value) => parseTiktokSourceUrl(value) !== null, {
      error: "url must be a TikTok channel URL (https://www.tiktok.com/@name).",
    }),
  /** Known from the source's metadata; looked up from the username when missing. */
  secUid: z.string().min(1).optional(),
  /** Videos published at or after this instant are collected. */
  since: z.iso.datetime({ offset: true }),
  /** Backfill only: the scan starts at this instant and newer videos are left out. */
  until: z.iso.datetime({ offset: true }).optional(),
  /** Marks a run that fills a gap instead of following the schedule. */
  backfill: z.boolean().optional(),
  /** Newest stored post before the run; used to count late arrivals. */
  newestKnownAt: z.iso.datetime({ offset: true }).optional(),
  /** Hard cap on collected videos. */
  maxRecords: z.int().min(1).max(5000).default(COLLECT_CONFIG.posts.maxRecordsPerRun),
});

export type TiktokPostsParams = z.infer<typeof tiktokPostsParamsSchema>;

/**
 * New videos of a channel, newest first from `since`, like `facebook-posts`.
 * Known videos are left alone; `tiktok-post-refresh` updates their counters.
 */
export const tiktokPostsConnector: DirectConnector<TiktokPostsParams> = {
  key: "tiktok-posts",
  platform: "tiktok",
  mode: "direct",
  paramsSchema: tiktokPostsParamsSchema,
  onExisting: "skip",

  async fetchRecords(params) {
    const ref = parseTiktokSourceUrl(params.url)!;
    const deadlineAt = Date.now() + COLLECT_CONFIG.tiktok.runBudgetMs;

    const resolved = params.secUid
      ? null
      : await fetchTiktokUserProfile({ uniqueId: ref.uniqueId });
    const secUid = params.secUid ?? resolved!.secUid;

    const scan = await scanTiktokChannel({
      secUid,
      since: new Date(params.since),
      until: params.until ? new Date(params.until) : undefined,
      maxPages: params.backfill
        ? COLLECT_CONFIG.tiktok.channel.maxPagesPerBackfillRun
        : COLLECT_CONFIG.tiktok.channel.maxPagesPerRun,
      maxRecords: params.maxRecords,
      pageSize: COLLECT_CONFIG.tiktok.pageSize,
      deadlineAt,
    });
    const transcripts = await attachTiktokTranscripts({ records: scan.records, deadlineAt });

    return {
      records: scan.records,
      stats: {
        requests: scan.requests + (resolved ? 1 : 0),
        stoppedBy: scan.stoppedBy,
        truncated: scan.truncated,
        transcripts,
      },
    };
  },

  normalize(records): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    let skipped = 0;
    let first: TiktokWebPost | null = null;
    let source: SourceDetails | undefined;

    for (const record of records) {
      const parsed = tiktokWebPostSchema.safeParse(record);

      if (!parsed.success) {
        skipped++;
        continue;
      }

      first ??= parsed.data;
      items.push(toTiktokWebPostContentItem(parsed.data));
    }

    if (first) source = toTiktokChannelSourceDetails(first);

    return { items, skipped, source };
  },

  afterNormalize(context, params) {
    return afterPostScan(context, { newestKnownAt: params.newestKnownAt });
  },
};
