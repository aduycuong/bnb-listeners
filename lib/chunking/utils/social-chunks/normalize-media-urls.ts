/**
 * Cleans a raw media URL list before it becomes chunks: trims, drops blanks and
 * anything that is not http(s), removes duplicates, and caps the count so one
 * gallery post cannot blow up embedding cost.
 *
 * Order is preserved so `mediaMetadata.index` matches the source ordering.
 */
export function normalizeMediaUrls(
  urls: string[] | undefined,
  limit: number,
): string[] {
  if (!urls?.length) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    if (!/^https?:\/\//i.test(url)) continue;

    seen.add(url);
    result.push(url);
    if (result.length >= limit) break;
  }

  return result;
}
