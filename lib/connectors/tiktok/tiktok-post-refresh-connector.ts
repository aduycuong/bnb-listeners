import { z } from "zod";

import { fetchTiktokVideos, TIKHUB_MAX_VIDEOS_PER_REQUEST } from "@/lib/tikhub/services/fetch-tiktok-videos";
import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { COLLECT_CONFIG } from "../config";
import { processRefreshCheckpoints } from "../services/process-refresh-checkpoints";
import type { DirectConnector, NormalizeResult } from "../types";
import { chunk } from "../utils/chunk";
import { tiktokAwemeSchema } from "./schema";
import { assertWithinRunBudget } from "./utils/assert-within-run-budget";
import { toTiktokAwemeContentItem } from "./utils/to-tiktok-aweme-content-item";

export const tiktokPostRefreshParamsSchema = z.object({
  posts: z
    .array(z.object({ contentItemId: z.uuid(), externalId: z.string().min(1) }))
    .min(1)
    .max(COLLECT_CONFIG.tiktok.refresh.postsPerRun),
});

export type TiktokPostRefreshParams = z.infer<typeof tiktokPostRefreshParamsSchema>;

/**
 * Re-reads known videos at their comment-refresh checkpoint: updates the
 * counters (with a snapshot), then applies the comment-collection rules and
 * starts the comment runs. Like `facebook-post-refresh`.
 */
export const tiktokPostRefreshConnector: DirectConnector<TiktokPostRefreshParams> = {
  key: "tiktok-post-refresh",
  platform: "tiktok",
  mode: "direct",
  paramsSchema: tiktokPostRefreshParamsSchema,

  async fetchRecords(params) {
    const deadlineAt = Date.now() + COLLECT_CONFIG.tiktok.runBudgetMs;
    const records: Record<string, unknown>[] = [];
    let requests = 0;

    for (const ids of chunk(
      params.posts.map((post) => post.externalId),
      TIKHUB_MAX_VIDEOS_PER_REQUEST,
    )) {
      assertWithinRunBudget(deadlineAt);
      records.push(...(await fetchTiktokVideos({ videoIds: ids })));
      requests++;
    }

    return {
      records,
      stats: { requests, requested: params.posts.length, returned: records.length },
    };
  },

  normalize(records): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    let skipped = 0;

    for (const record of records) {
      const parsed = tiktokAwemeSchema.safeParse(record);

      if (!parsed.success) {
        skipped++;
        continue;
      }

      items.push(toTiktokAwemeContentItem(parsed.data));
    }

    return { items, skipped };
  },

  // Videos TikHub did not return (deleted, private) are still moved on, with
  // their last known comment count.
  async afterNormalize(_context, params) {
    const { decisions, followUps } = await processRefreshCheckpoints({
      contentItemIds: params.posts.map((post) => post.contentItemId),
    });

    return {
      stats: {
        checked: decisions.length,
        commentRunsPlanned: followUps.length,
        postsToCollect: decisions.filter((decision) => decision.collect).length,
      },
      followUps,
    };
  },
};
