import { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { COLLECT_CONFIG } from "../config";
import { createItemRefreshSchedules } from "../services/create-item-refresh-schedules";
import { measureLateArrivals } from "../services/measure-late-arrivals";
import { recomputeSourceActivityTier } from "../services/recompute-source-activity-tier";
import type { JobConnector, NormalizeResult } from "../types";
import { brightDataJobMethods } from "../utils/bright-data-job-methods";
import { isBrightDataErrorRecord } from "../utils/is-bright-data-error-record";
import {
  type BrightDataFacebookPost,
  brightDataFacebookPostSchema,
} from "./schema";
import { parseFacebookSourceUrl } from "./utils/parse-facebook-source-url";
import { toFacebookPostContentItem } from "./utils/to-facebook-post-content-item";

const GROUP_POSTS_DATASET_ID = "gd_lz11l67o2cb3r0lkj3";
const PAGE_POSTS_DATASET_ID = "gd_lkaxegm826bjpoo9m5";

export const facebookPostsParamsSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((value) => parseFacebookSourceUrl(value) !== null, {
      error: "url must be a Facebook group or page URL.",
    }),
  /**
   * Bright Data `start_date`: posts published at or after this instant. The
   * job stops there on its own, so no `num_of_posts` is sent.
   */
  since: z.iso.datetime({ offset: true }),
  /** Newest stored post before the run; used to count late arrivals. */
  newestKnownAt: z.iso.datetime({ offset: true }).optional(),
  /** Hard cap on delivered records (`limit_multiple_results`). */
  maxRecords: z.int().min(1).max(5000).default(COLLECT_CONFIG.posts.maxRecordsPerRun),
});

export type FacebookPostsParams = z.infer<typeof facebookPostsParamsSchema>;

export const facebookPostsConnector: JobConnector<FacebookPostsParams> = {
  key: "facebook-posts",
  platform: "facebook",
  mode: "job",
  paramsSchema: facebookPostsParamsSchema,
  // Engagement of known posts is refreshed by `facebook-post-refresh` only.
  onExisting: "skip",

  startJob(params, context) {
    const ref = parseFacebookSourceUrl(params.url);

    return brightDataJobMethods.start({
      datasetId:
        ref?.sourceType === "group" ? GROUP_POSTS_DATASET_ID : PAGE_POSTS_DATASET_ID,
      collectRunId: context.collectRunId,
      limitRecords: params.maxRecords,
      input: [
        {
          url: params.url,
          posts_to_not_include: [],
          // ISO datetimes filter to the second (probe of 2026-10-12).
          start_date: new Date(params.since).toISOString(),
          end_date: "",
        },
      ],
    });
  },

  normalize(records): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    let skipped = 0;
    let first: BrightDataFacebookPost | null = null;

    for (const record of records) {
      const parsed = isBrightDataErrorRecord(record)
        ? null
        : brightDataFacebookPostSchema.safeParse(record);

      if (!parsed?.success) {
        skipped++;
        continue;
      }

      first ??= parsed.data;
      items.push(toFacebookPostContentItem(parsed.data));
    }

    return {
      items,
      skipped,
      source: first
        ? {
            name: first.group_name?.trim() || first.page_name?.trim() || null,
            memberCount: first.group_members ?? null,
            followerCount: first.page_followers ?? null,
            metadata: {
              ...(first.group_id && { groupId: first.group_id }),
              ...(first.group_category && { groupCategory: first.group_category }),
            },
          }
        : undefined,
    };
  },

  async afterNormalize(context, params) {
    const [lateArrivals, schedules] = await Promise.all([
      measureLateArrivals({
        collectRunId: context.collectRunId,
        newestKnownAt: params.newestKnownAt,
      }),
      createItemRefreshSchedules({ collectRunId: context.collectRunId }),
    ]);
    const tier = context.sourceId
      ? await recomputeSourceActivityTier({ sourceId: context.sourceId })
      : null;

    return { stats: { ...lateArrivals, ...schedules, ...tier } };
  },
};
