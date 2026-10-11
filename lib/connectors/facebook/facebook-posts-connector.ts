import { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

import type { FollowUpRun, JobConnector, NormalizeResult } from "../types";
import { brightDataJobMethods } from "../utils/bright-data-job-methods";
import { isBrightDataErrorRecord } from "../utils/is-bright-data-error-record";
import {
  type BrightDataFacebookPost,
  brightDataFacebookPostSchema,
} from "./schema";
import { extractFacebookPostMedia } from "./utils/extract-facebook-post-media";
import { parseFacebookReactions } from "./utils/parse-facebook-reactions";
import { parseFacebookSourceUrl } from "./utils/parse-facebook-source-url";

const GROUP_POSTS_DATASET_ID = "gd_lz11l67o2cb3r0lkj3";
const PAGE_POSTS_DATASET_ID = "gd_lkaxegm826bjpoo9m5";

/** Post URLs per follow-up comments run. */
const COMMENT_RUN_POST_LIMIT = 50;

export const facebookPostsParamsSchema = z.object({
  url: z
    .string()
    .trim()
    .refine((value) => parseFacebookSourceUrl(value) !== null, {
      error: "url must be a Facebook group or page URL.",
    }),
  /** ISO datetime; only posts published on or after this day are requested. */
  since: z.iso.datetime({ offset: true }).optional(),
  /** Upper bound per run, not a fixed page size. */
  limit: z.int().min(1).max(2000).default(500),
  collectComments: z.boolean().default(true),
  commentsPerPost: z.int().min(1).max(1000).default(100),
});

export type FacebookPostsParams = z.infer<typeof facebookPostsParamsSchema>;

/** Bright Data expects MM-DD-YYYY; the day is taken in UTC. */
function toBrightDataDate(iso: string): string {
  const date = new Date(iso);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}-${date.getUTCFullYear()}`;
}

function toContentItem(post: BrightDataFacebookPost): NormalizedContentItem {
  const authorExternalId = post.profile_id?.trim() || post.user_url?.trim() || null;

  return {
    kind: "post",
    externalId: post.post_id,
    url: post.url,
    text: post.content?.trim() ?? "",
    media: extractFacebookPostMedia(post),
    publishedAt: post.date_posted ? new Date(post.date_posted) : null,
    likeCount: post.likes ?? 0,
    commentCount: post.num_comments ?? 0,
    shareCount: post.num_shares ?? 0,
    viewCount: post.video_view_count ?? 0,
    reactions: parseFacebookReactions(post.num_reaction_type),
    author: authorExternalId
      ? {
          externalId: authorExternalId,
          name: post.user_username_raw?.trim() || null,
          url: post.user_url ?? null,
          avatarUrl: post.publisher_image_url ?? null,
          metadata: { isPage: !!post.delegate_page_id },
        }
      : null,
    parentExternalId: null,
    rootExternalId: null,
    metadata: {
      postType: post.post_type ?? null,
      isSponsored: post.is_sponsored ?? false,
      hashtags: post.hashtags ?? [],
    },
  };
}

export const facebookPostsConnector: JobConnector<FacebookPostsParams> = {
  key: "facebook-posts",
  platform: "facebook",
  mode: "job",
  paramsSchema: facebookPostsParamsSchema,

  startJob(params, context) {
    const ref = parseFacebookSourceUrl(params.url);

    return brightDataJobMethods.start({
      datasetId:
        ref?.sourceType === "group" ? GROUP_POSTS_DATASET_ID : PAGE_POSTS_DATASET_ID,
      collectRunId: context.collectRunId,
      input: [
        {
          url: params.url,
          num_of_posts: params.limit,
          posts_to_not_include: [],
          start_date: params.since ? toBrightDataDate(params.since) : "",
          end_date: "",
        },
      ],
    });
  },

  getJobStatus: brightDataJobMethods.getJobStatus,
  downloadJobResult: brightDataJobMethods.downloadJobResult,

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
      items.push(toContentItem(parsed.data));
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

  planFollowUps(written, params): FollowUpRun[] {
    if (!params.collectComments) return [];

    const postUrls = written
      .filter(
        (item) =>
          item.url &&
          item.commentCount > 0 &&
          (item.previousCommentCount === null ||
            item.commentCount > item.previousCommentCount),
      )
      .map((item) => item.url as string);

    const runs: FollowUpRun[] = [];
    for (let i = 0; i < postUrls.length; i += COMMENT_RUN_POST_LIMIT) {
      runs.push({
        connector: "facebook-comments",
        params: {
          postUrls: postUrls.slice(i, i + COMMENT_RUN_POST_LIMIT),
          limitPerPost: params.commentsPerPost,
        },
      });
    }

    return runs;
  },
};
