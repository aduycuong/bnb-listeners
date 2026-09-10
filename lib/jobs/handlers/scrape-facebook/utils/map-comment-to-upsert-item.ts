import type { UpsertCommentItem } from "@/lib/comments/types";

import type { BrightDataFacebookComment } from "../types";
import { buildCommentMetadata } from "./build-comment-metadata";

export function mapCommentToUpsertItem(
  comment: BrightDataFacebookComment,
): UpsertCommentItem {
  return {
    sourceId: comment.comment_id,
    content: comment.comment_text.trim(),
    authorName: comment.user_name?.trim() ?? null,
    authorId: comment.user_id?.trim() ?? null,
    likeCount: comment.num_likes,
    publishedAt: comment.date_created ?? null,
    metadata: buildCommentMetadata(comment),
  };
}
