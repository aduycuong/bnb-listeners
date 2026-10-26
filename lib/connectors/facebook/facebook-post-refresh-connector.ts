import { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { processRefreshCheckpoints } from "../services/process-refresh-checkpoints";
import type { JobConnector, NormalizeResult } from "../types";
import { brightDataJobMethods } from "../utils/bright-data-job-methods";
import { isBrightDataErrorRecord } from "../utils/is-bright-data-error-record";
import { brightDataFacebookPostSchema } from "./schema";
import { toFacebookPostContentItem } from "./utils/to-facebook-post-content-item";

/** Post by URL: one record per post, with a few top comments. */
const POST_BY_URL_DATASET_ID = "gd_lyclm1571iy3mv57zw";

export const facebookPostRefreshParamsSchema = z.object({
  posts: z
    .array(z.object({ contentItemId: z.uuid(), url: z.url() }))
    .min(1)
    .max(100),
});

export type FacebookPostRefreshParams = z.infer<typeof facebookPostRefreshParamsSchema>;

/**
 * Re-reads known posts at their comment-refresh checkpoint: updates
 * engagement (with a snapshot) and `metadata.topComments`, then applies the
 * comment-collection rules and starts the comment runs.
 */
export const facebookPostRefreshConnector: JobConnector<FacebookPostRefreshParams> = {
  key: "facebook-post-refresh",
  platform: "facebook",
  mode: "job",
  paramsSchema: facebookPostRefreshParamsSchema,

  startJob(params, context) {
    return brightDataJobMethods.start({
      datasetId: POST_BY_URL_DATASET_ID,
      collectRunId: context.collectRunId,
      limitRecords: params.posts.length,
      input: params.posts.map((post) => ({ url: post.url })),
    });
  },

  normalize(records): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    let skipped = 0;

    for (const record of records) {
      const parsed = isBrightDataErrorRecord(record)
        ? null
        : brightDataFacebookPostSchema.safeParse(record);

      if (!parsed?.success) {
        skipped++;
        continue;
      }

      items.push(toFacebookPostContentItem(parsed.data));
    }

    return { items, skipped };
  },

  // Posts the provider did not return (deleted, private) are still moved on,
  // with their last known comment count.
  async afterNormalize(_context, params) {
    const { decisions, followUps } = await processRefreshCheckpoints({
      contentItemIds: params.posts.map((post) => post.contentItemId),
    });

    return {
      stats: {
        checked: decisions.length,
        commentRunsPlanned: followUps.length,
        postsToCollect: decisions.filter((decision) => decision.collect).length,
        commentsDeferredForBudget: decisions.filter((decision) => decision.deferredForBudget).length,
      },
      followUps,
    };
  },
};
