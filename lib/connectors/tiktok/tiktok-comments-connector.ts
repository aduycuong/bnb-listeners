import { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { COLLECT_CONFIG } from "../config";
import { measureCommentCoverage } from "../services/measure-comment-coverage";
import type { DirectConnector, NormalizeResult } from "../types";
import { tiktokCommentSchema } from "./schema";
import { collectTiktokComments } from "./services/collect-tiktok-comments";
import { toTiktokCommentContentItem } from "./utils/to-tiktok-comment-content-item";

export const tiktokCommentsParamsSchema = z.object({
  videos: z
    .array(z.object({ externalId: z.string().min(1), url: z.url() }))
    .min(1)
    .max(20),
  /** Rows per video, replies included. */
  limitPerVideo: z
    .int()
    .min(1)
    .max(1000)
    .default(COLLECT_CONFIG.commentRefresh.maxRowsPerPost),
  includeReplies: z.boolean().default(COLLECT_CONFIG.commentRefresh.includeReplies),
});

export type TiktokCommentsParams = z.infer<typeof tiktokCommentsParamsSchema>;

/**
 * Comments and replies of known videos. Each row names its video in
 * `aweme_id` (set by the fetch when TikHub leaves it out), so normalizing
 * needs nothing but the run params, which carry the video URLs.
 */
export const tiktokCommentsConnector: DirectConnector<TiktokCommentsParams> = {
  key: "tiktok-comments",
  platform: "tiktok",
  mode: "direct",
  paramsSchema: tiktokCommentsParamsSchema,

  async fetchRecords(params) {
    const result = await collectTiktokComments({
      videoIds: params.videos.map((video) => video.externalId),
      limitPerVideo: params.limitPerVideo,
      includeReplies: params.includeReplies,
      pageSize: COLLECT_CONFIG.tiktok.pageSize,
      deadlineAt: Date.now() + COLLECT_CONFIG.tiktok.runBudgetMs,
    });

    return {
      records: result.records,
      stats: {
        requests: result.requests,
        videos: result.videos,
        incompleteVideos: result.videos.filter((video) => !video.complete).length,
      },
    };
  },

  normalize(records, params): NormalizeResult {
    const urlByVideoId = new Map(params.videos.map((video) => [video.externalId, video.url]));
    const items: NormalizedContentItem[] = [];
    let skipped = 0;

    for (const record of records) {
      const parsed = tiktokCommentSchema.safeParse(record);
      const videoId = parsed.success ? parsed.data.aweme_id : null;

      const item =
        parsed.success && videoId
          ? toTiktokCommentContentItem({
              comment: parsed.data,
              videoId,
              videoUrl: urlByVideoId.get(videoId) ?? null,
            })
          : null;

      if (!item) {
        skipped++;
        continue;
      }

      items.push(item);
    }

    return { items, skipped };
  },

  async afterNormalize(context, params) {
    const coverage = await measureCommentCoverage({
      collectRunId: context.collectRunId,
      postUrls: params.videos.map((video) => video.url),
      limitPerPost: params.limitPerVideo,
    });
    return { stats: coverage };
  },
};
