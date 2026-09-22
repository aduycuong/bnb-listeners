/**
 * Media URL placeholders for LLM prompts.
 *
 * Why this exists: archived media URLs are ~90 characters long and nearly
 * identical to each other — `…/documents/{workspaceId}/{documentId}/{partIndex}.jpg`,
 * i.e. two UUIDs where the first one is the same for every URL in a run. When
 * the synthesize / HTML models have to *copy* dozens of these strings into a
 * long output, attention "skips" mid-UUID and splices the prefix of one URL onto
 * the tail of another. Observed in run `d0866974-…` (the DB rows were all
 * correct; the corruption only appeared in the generated report):
 *
 *   documents/457622e0-6416-4e|4d-483c-94e2-742beb931037/1.jpg
 *             └ workspace id ┘ └ tail of doc 463c8f88-4efd-483c-94e2-742beb931037 ┘
 *
 * The resulting R2 key does not exist, so the image 404s. A prompt instruction
 * ("do not alter URLs") does not prevent this — the model is not deciding to
 * change the URL, it is failing to reproduce it.
 *
 * Fix: never let the model see or copy a real URL. Evidence / the Markdown
 * report is rewritten with short `media://N` tokens, the model reproduces those
 * (short, unique, trivially copyable), and the tokens are swapped back for the
 * real URLs after generation. Any image left pointing at an unknown URL (a token
 * we never issued, or a URL the model invented) is a hallucination and is
 * removed rather than shipped as a broken image.
 */

export const MEDIA_PLACEHOLDER_SCHEME = "media://";

/**
 * An http(s) URL wrapped in parentheses. Covers every place a media URL is
 * surfaced to the model: Markdown images `![alt](url)`, Markdown links
 * `[text](url)` and attachment lines `- [image] summary (url)` produced by
 * `formatInternalFinding`.
 */
const PARENTHESIZED_URL_RE = /\((https?:\/\/[^\s()]+)\)/g;

/** A placeholder token as emitted by the model, e.g. `media://12`. */
const PLACEHOLDER_RE = /media:\/\/\d+/g;

/** Markdown image; the URL group also matches unresolved `media://N` tokens. */
const MARKDOWN_IMAGE_RE = /!\[[^\]]*\]\(([^\s()]+)\)/g;

const HTML_IMG_TAG_RE = /<img\b[^>]*>/gi;
const HTML_SRC_ATTR_RE = /\ssrc\s*=\s*["']([^"']+)["']/i;

export type MediaPlaceholderMap = {
  /** real URL → `media://N` */
  byUrl: Map<string, string>;
  /** `media://N` → real URL */
  byPlaceholder: Map<string, string>;
};

/** Returns every parenthesized http(s) URL in `text`, in order of appearance. */
export function collectParenthesizedUrls(text: string): string[] {
  return Array.from(text.matchAll(PARENTHESIZED_URL_RE), (match) => match[1]);
}

/** Assigns a stable `media://N` token to each distinct URL (1-based, in order). */
export function createMediaPlaceholderMap(
  urls: Iterable<string>,
): MediaPlaceholderMap {
  const byUrl = new Map<string, string>();
  const byPlaceholder = new Map<string, string>();

  for (const url of urls) {
    if (byUrl.has(url)) continue;
    const placeholder = `${MEDIA_PLACEHOLDER_SCHEME}${byUrl.size + 1}`;
    byUrl.set(url, placeholder);
    byPlaceholder.set(placeholder, url);
  }

  return { byUrl, byPlaceholder };
}

/** Replaces every known parenthesized URL in `text` with its placeholder. */
export function applyMediaPlaceholders(
  text: string,
  map: MediaPlaceholderMap,
): string {
  return text.replace(PARENTHESIZED_URL_RE, (match, url: string) => {
    const placeholder = map.byUrl.get(url);
    return placeholder ? `(${placeholder})` : match;
  });
}

/**
 * Swaps known placeholders back to their real URLs. Unknown tokens (the model
 * invented an `N` we never issued) are left untouched so the format-specific
 * strip step below can remove the whole image instead of leaving a broken URL.
 */
export function restoreMediaPlaceholders(
  text: string,
  map: MediaPlaceholderMap,
): string {
  return text.replace(
    PLACEHOLDER_RE,
    (placeholder) => map.byPlaceholder.get(placeholder) ?? placeholder,
  );
}

/**
 * Restores placeholders in a Markdown report and removes any image whose URL
 * is not one we handed to the model — either an unresolved `media://N` or a
 * URL the model wrote by hand (which, per the bug above, is almost certainly
 * a spliced UUID that points at nothing).
 */
export function finalizeMarkdownMedia(
  markdown: string,
  map: MediaPlaceholderMap,
): string {
  const restored = restoreMediaPlaceholders(markdown, map);
  return restored.replace(MARKDOWN_IMAGE_RE, (image, url: string) =>
    map.byUrl.has(url) ? image : "",
  );
}

/**
 * HTML counterpart of `finalizeMarkdownMedia`: restores placeholders anywhere
 * in the document (src, href, text) and drops `<img>` tags whose `src` is a
 * remote URL or an unresolved token we did not issue. Non-remote sources
 * (e.g. `data:` URIs) are left alone since they cannot be a copied media URL.
 */
export function finalizeHtmlMedia(
  html: string,
  map: MediaPlaceholderMap,
): string {
  const restored = restoreMediaPlaceholders(html, map);
  return restored.replace(HTML_IMG_TAG_RE, (tag) => {
    const src = HTML_SRC_ATTR_RE.exec(tag)?.[1];
    if (!src || map.byUrl.has(src)) return tag;

    const isRemoteOrToken =
      /^https?:\/\//i.test(src) || src.startsWith(MEDIA_PLACEHOLDER_SCHEME);
    return isRemoteOrToken ? "" : tag;
  });
}
