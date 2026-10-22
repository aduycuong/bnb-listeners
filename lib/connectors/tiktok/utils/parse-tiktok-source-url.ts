import { buildTiktokProfileUrl } from "./build-tiktok-video-url";

export type TiktokChannelRef = {
  uniqueId: string;
  canonicalUrl: string;
};

const HANDLE_PATTERN = /^[A-Za-z0-9._]{1,24}$/;
const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);

/**
 * Reads a channel from its profile URL (`https://www.tiktok.com/@handle`).
 * Video, hashtag and search URLs are not channels and return null.
 */
export function parseTiktokSourceUrl(rawUrl: string): TiktokChannelRef | null {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (!TIKTOK_HOSTS.has(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 1 || !segments[0].startsWith("@")) return null;

  const uniqueId = segments[0].slice(1);
  if (!HANDLE_PATTERN.test(uniqueId)) return null;

  const normalized = uniqueId.toLowerCase();
  return { uniqueId: normalized, canonicalUrl: buildTiktokProfileUrl(normalized) };
}
