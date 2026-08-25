import type { BrightDataFacebookPost } from "../types";

/**
 * Builds the markdown rawContent string for a Facebook post document.
 *
 * The engagement tail (likes/comments/shares/source) is appended after the
 * post body so that semantic search picks up engagement signals alongside
 * content. The separator line keeps the two sections visually distinct.
 */
export function buildPostRawContent(post: BrightDataFacebookPost): string {
  const lines: string[] = [];

  lines.push(post.content.trim());

  lines.push("");
  lines.push("---");

  const author = post.user_username_raw?.trim() || "Ẩn danh";
  lines.push(`**Tác giả:** ${author}`);
  lines.push(
    `**Lượt thích:** ${post.likes} | **Bình luận:** ${post.num_comments} | **Chia sẻ:** ${post.num_shares}`,
  );

  if (post.group_name) {
    lines.push(`**Nguồn:** ${post.group_name}`);
  }

  return lines.join("\n");
}
