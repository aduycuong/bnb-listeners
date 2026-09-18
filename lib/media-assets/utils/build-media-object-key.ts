import { getExtensionFromMime } from "@/lib/r2/utils/get-extension-from-mime";

import { MEDIA_OBJECT_KEY_PREFIX } from "../config";

/**
 * Deterministic key so re-archiving the same part overwrites instead of
 * accumulating copies: documents/{segment}/{segment}/….{ext}
 */
export function buildMediaObjectKey(
  segments: Array<string | number>,
  contentType: string,
): string {
  const cleaned = segments
    .map((segment) => String(segment).trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, "_"));

  const ext = getExtensionFromMime(contentType);

  return `${MEDIA_OBJECT_KEY_PREFIX}/${cleaned.join("/")}.${ext}`;
}
