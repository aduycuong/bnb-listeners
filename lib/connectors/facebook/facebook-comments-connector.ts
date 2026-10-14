import { z } from "zod";

import type { NormalizedContentItem } from "@/lib/raw-store/types";

import { COLLECT_CONFIG } from "../config";
import { measureCommentCoverage } from "../services/measure-comment-coverage";
import type { JobConnector, NormalizeResult } from "../types";
import { brightDataJobMethods } from "../utils/bright-data-job-methods";
import { isBrightDataErrorRecord } from "../utils/is-bright-data-error-record";
import {
  type BrightDataFacebookComment,
  brightDataFacebookCommentSchema,
} from "./schema";
import { toFacebookCommentAuthor } from "./utils/to-facebook-comment-author";
import { toFacebookCommentExternalId } from "./utils/to-facebook-comment-external-id";

const COMMENTS_DATASET_ID = "gd_lkay758p1eanlolqw8";

export const facebookCommentsParamsSchema = z.object({
  postUrls: z.array(z.url()).min(1).max(100),
  limitPerPost: z
    .int()
    .min(1)
    .max(1000)
    .default(COLLECT_CONFIG.commentRefresh.maxRowsPerPost),
});

export type FacebookCommentsParams = z.infer<typeof facebookCommentsParamsSchema>;

function toContentItem(
  comment: BrightDataFacebookComment,
): NormalizedContentItem | null {
  const text = comment.comment_text?.trim() ?? "";
  const images = comment.attached_images ?? [];
  if (!text && images.length === 0) return null;

  // A reply's parent is a top-level comment or another reply.
  const isReply = !!comment.reply && !!comment.parent_comment_id;

  return {
    kind: isReply ? "reply" : "comment",
    externalId: comment.comment_id,
    url: comment.comment_link ?? comment.url ?? null,
    text,
    media: images
      .filter((url) => /^https?:\/\//i.test(url))
      .map((url) => ({ type: "image" as const, url })),
    publishedAt: comment.date_created ? new Date(comment.date_created) : null,
    likeCount: comment.num_likes ?? 0,
    commentCount: comment.num_replies ?? 0,
    shareCount: 0,
    viewCount: 0,
    reactions: null,
    author: toFacebookCommentAuthor(comment),
    parentExternalId: isReply
      ? toFacebookCommentExternalId(comment.parent_comment_id!, comment.post_id)
      : comment.post_id,
    rootExternalId: comment.post_id,
    metadata: {
      postId: comment.post_id,
      type: comment.type ?? null,
    },
  };
}

export const facebookCommentsConnector: JobConnector<FacebookCommentsParams> = {
  key: "facebook-comments",
  platform: "facebook",
  mode: "job",
  paramsSchema: facebookCommentsParamsSchema,

  startJob(params, context) {
    return brightDataJobMethods.start({
      datasetId: COMMENTS_DATASET_ID,
      collectRunId: context.collectRunId,
      input: params.postUrls.map((url) => ({
        url,
        get_all_replies: COLLECT_CONFIG.commentRefresh.includeReplies,
        limit_records: params.limitPerPost,
        comments_sort: COLLECT_CONFIG.commentRefresh.sort,
      })),
    });
  },

  normalize(records): NormalizeResult {
    const items: NormalizedContentItem[] = [];
    let skipped = 0;

    for (const record of records) {
      const parsed = isBrightDataErrorRecord(record)
        ? null
        : brightDataFacebookCommentSchema.safeParse(record);
      const item = parsed?.success ? toContentItem(parsed.data) : null;

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
      postUrls: params.postUrls,
      limitPerPost: params.limitPerPost,
    });
    return { stats: coverage };
  },
};
