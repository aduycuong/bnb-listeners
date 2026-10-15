/**
 * Channel of a source as the demo names them ("Facebook", "Group Facebook", "TikTok", …):
 * the platform, with Facebook groups apart from pages and profiles.
 */
export function channelLabel(platform: string | null, sourceType: string | null): string {
  if (platform === "facebook") return sourceType === "group" ? "Group Facebook" : "Facebook";
  if (platform === "tiktok") return "TikTok";
  if (platform === "youtube") return "YouTube";
  if (platform === "news") return "Báo điện tử";
  if (platform === "forum") return "Diễn đàn";
  if (platform === "classifieds") return "Trang rao vặt";
  return platform ?? "Không rõ";
}
