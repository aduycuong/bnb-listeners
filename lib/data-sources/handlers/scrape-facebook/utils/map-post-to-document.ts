import type { UpsertDocumentParams } from "@/lib/documents/types";

import type { BrightDataFacebookPost } from "../types";
import { buildPostMetadata } from "./build-post-metadata";

type MapPostToDocumentOptions = {
  /**
   * The Facebook source URL (page or group) used as the document's sourceOriginKey.
   * Passed explicitly so all posts from the same dataSource share the same canonical
   * sourceOriginKey regardless of minor URL variations in the payload.
   */
  sourceOriginKey: string;
  post: BrightDataFacebookPost;
};

/**
 * Maps a parsed Bright Data Facebook post to upsert params (dataSourceId/sourceRunId added by caller).
 *
 * Mapping decisions:
 *   docType    = "post"          — social content, chunked as an atomic unit
 *   sourceOriginKey  = caller-supplied — canonical URL of the group or page
 *   sourceItemId   = post_id         — Bright Data's stable post identifier
 *   sourceOriginName = group_name      — human-readable group / page name
 *   title      = none            — Facebook posts have no title; the UI shows
 *                                  author + date instead
 *   authorName = user_username_raw — also kept in metadata.authorName
 *   rawContent = post body only  — author, engagement and source context are
 *                                  columns and metadata, not embedded text
 */
export function mapPostToDocument({
  sourceOriginKey,
  post,
}: MapPostToDocumentOptions): Omit<UpsertDocumentParams, "dataSourceId" | "sourceRunId"> {
  const sourceOriginName = post.group_name?.trim() || "Facebook";
  const metadata = buildPostMetadata(post);

  return {
    docType: "post",
    sourceOriginKey,
    sourceOriginName,
    sourceItemId: post.post_id,
    rawContent: post.content.trim(),
    authorName: metadata.authorName,
    metadata,
    engagement: {
      likeCount: post.likes,
      commentCount: post.num_comments,
      shareCount: post.num_shares,
      viewCount: post.video_view_count,
    },
    publishedAt: post.date_posted ?? undefined,
  };
}
