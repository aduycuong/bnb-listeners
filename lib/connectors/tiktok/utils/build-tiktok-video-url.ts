/**
 * Canonical video URL. TikTok resolves `@/video/{id}` too, so a video whose
 * author is unknown still gets a working link.
 */
export function buildTiktokVideoUrl(
  uniqueId: string | null | undefined,
  videoId: string,
): string {
  return `https://www.tiktok.com/@${uniqueId?.trim() ?? ""}/video/${videoId}`;
}

export function buildTiktokProfileUrl(uniqueId: string): string {
  return `https://www.tiktok.com/@${uniqueId}`;
}
