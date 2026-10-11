import type { ContentItemMedia } from "@/db/schema";

import type { BrightDataFacebookPost } from "../schema";

const URL_KEYS = ["url", "attachment_url", "video_url", "image_url", "src"];
const VIDEO_URL_KEYS = ["video_url", ...URL_KEYS.filter((key) => key !== "video_url")];

/**
 * Image and video URLs from a post. Bright Data's `attachments` shape drifts
 * between datasets, so an attachment is used only when its `type` says image
 * or video and it exposes an http(s) URL under a known key.
 */
export function extractFacebookPostMedia(
  post: BrightDataFacebookPost,
): ContentItemMedia[] {
  const media = new Map<string, ContentItemMedia>();

  if (post.post_image) {
    media.set(post.post_image, { type: "image", url: post.post_image });
  }

  for (const attachment of post.attachments ?? []) {
    if (!attachment || typeof attachment !== "object") continue;

    const record = attachment as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
    const kind =
      type.includes("video") || type.includes("reel")
        ? "video"
        : type.includes("photo") || type.includes("image")
          ? "image"
          : null;
    if (!kind) continue;

    for (const key of kind === "video" ? VIDEO_URL_KEYS : URL_KEYS) {
      const value = record[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
        media.set(value.trim(), { type: kind, url: value.trim() });
        break;
      }
    }
  }

  return [...media.values()];
}
