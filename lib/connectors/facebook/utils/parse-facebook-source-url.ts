export type FacebookSourceRef = {
  sourceType: "group" | "page";
  /** `group:{id}` or `page:{id}`, lowercased; unique within the platform. */
  externalId: string;
  canonicalUrl: string;
};

const RESERVED_PAGE_PATHS = new Set([
  "groups",
  "watch",
  "events",
  "marketplace",
  "photo",
  "photo.php",
  "story.php",
  "permalink.php",
  "share",
  "sharer",
  "login",
]);

/**
 * Derives a stable source key from a Facebook group or page URL, so the same
 * source registered from a data source URL, a payload `group_url` or a legacy
 * document resolves to one `sources` row. Returns null for non-source URLs.
 */
export function parseFacebookSourceUrl(rawUrl: string): FacebookSourceRef | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== "facebook.com" && !host.endsWith(".facebook.com")) {
    return null;
  }

  const segments = url.pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment).trim().toLowerCase())
    .filter(Boolean);

  if (segments[0] === "groups") {
    const id = segments[1];
    if (!id) return null;
    return {
      sourceType: "group",
      externalId: `group:${id}`,
      canonicalUrl: `https://www.facebook.com/groups/${id}`,
    };
  }

  if (segments[0] === "profile.php") {
    const id = url.searchParams.get("id")?.trim();
    if (!id) return null;
    return {
      sourceType: "page",
      externalId: `page:${id}`,
      canonicalUrl: `https://www.facebook.com/profile.php?id=${id}`,
    };
  }

  // /people/{name}/{id} and /pg/{handle}
  if (segments[0] === "people" && segments[2]) {
    return {
      sourceType: "page",
      externalId: `page:${segments[2]}`,
      canonicalUrl: `https://www.facebook.com/people/${segments[1]}/${segments[2]}`,
    };
  }

  const handle = segments[0] === "pg" ? segments[1] : segments[0];
  if (!handle || RESERVED_PAGE_PATHS.has(handle)) return null;

  return {
    sourceType: "page",
    externalId: `page:${handle}`,
    canonicalUrl: `https://www.facebook.com/${handle}`,
  };
}
