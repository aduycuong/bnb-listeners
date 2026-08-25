import type { CreateDocumentParams } from "@/lib/documents/types";

import type { BrightDataFacebookPost } from "../types";
import { buildPostMetadata } from "./build-post-metadata";
import { buildPostRawContent } from "./build-post-raw-content";

type MapPostToDocumentOptions = {
  /**
   * The Facebook source URL (page or group) used as the document's sourceKey.
   * Passed explicitly so all posts from the same job share the same canonical
   * sourceKey regardless of minor URL variations in the payload.
   */
  sourceKey: string;
  post: BrightDataFacebookPost;
};

/**
 * Maps a parsed Bright Data Facebook post to a CreateDocumentParams object
 * ready to be passed to createDocument().
 *
 * Mapping decisions:
 *   docType   = "post"          — matches chunk_recursive_by_token strategy
 *   sourceKey = caller-supplied — canonical URL of the group or page
 *   sourceId  = post_id         — Bright Data's stable post identifier
 *   sourceName = group_name     — human-readable group / page name
 */
export function mapPostToDocument({
  sourceKey,
  post,
}: MapPostToDocumentOptions): CreateDocumentParams {
  const sourceName = post.group_name?.trim() || "Facebook";

  return {
    docType: "post",
    sourceKey,
    sourceName,
    sourceId: post.post_id,
    title: buildPostTitle(post),
    rawContent: buildPostRawContent(post),
    metadata: buildPostMetadata(post),
    publishedAt: post.date_posted ?? undefined,
  };
}

function buildPostTitle(post: BrightDataFacebookPost): string {
  const author = post.user_username_raw?.trim() || "Ẩn danh";
  const body = post.content.trim().replace(/\s+/g, " ");
  const preview = body.length > 80 ? `${body.slice(0, 80)}…` : body;
  return `${author}: ${preview}`;
}
