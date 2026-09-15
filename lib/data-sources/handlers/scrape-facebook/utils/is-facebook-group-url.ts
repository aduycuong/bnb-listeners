export function isFacebookGroupUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (!host.includes("facebook.com")) return false;

    const path = url.pathname.toLowerCase();
    return path === "/groups" || path.startsWith("/groups/");
  } catch {
    return false;
  }
}
