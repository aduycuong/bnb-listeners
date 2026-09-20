import type { BrightDataFacebookPost } from "../types";

export type PostMediaUrls = {
  imageUrls: string[];
  videoUrls: string[];
};

const URL_KEYS = ["url", "attachment_url", "video_url", "image_url", "src"];
const VIDEO_URL_KEYS = ["video_url", ...URL_KEYS.filter((key) => key !== "video_url")];

/**
 * Pulls image and video URLs out of a Bright Data post so they can be stored on
 * the document and later turned into media chunks.
 *
 * Bright Data types `attachments` as an opaque array and its shape drifts
 * between datasets, so entries are read defensively: an attachment is only used
 * when it exposes an http(s) URL under a known key, and its kind is taken from
 * the explicit `type` field. Anything unrecognised is dropped rather than guessed at.
 */
export function extractPostMediaUrls(
  post: BrightDataFacebookPost,
): PostMediaUrls {
  const imageUrls = new Set<string>();
  const videoUrls = new Set<string>();

  if (post.post_image) imageUrls.add(post.post_image);

  for (const attachment of post.attachments) {
    if (!attachment || typeof attachment !== "object") continue;

    const record = attachment as Record<string, unknown>;
    const kind = resolveKind(record);
    if (!kind) continue;

    const url = readUrl(record, kind);
    if (!url) continue;

    if (kind === "video") videoUrls.add(url);
    else if (kind === "image") imageUrls.add(url);
  }

  return { imageUrls: [...imageUrls], videoUrls: [...videoUrls] };
}

function readUrl(
  record: Record<string, unknown>,
  kind: "image" | "video",
): string | null {
  const keys = kind === "video" ? VIDEO_URL_KEYS : URL_KEYS;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }

  return null;
}

function resolveKind(
  record: Record<string, unknown>,
): "image" | "video" | null {
  const type = typeof record.type === "string" ? record.type.toLowerCase() : "";

  if (type.includes("video") || type.includes("reel")) return "video";
  if (type.includes("photo") || type.includes("image")) return "image";

  return null;
}
