type BuildTiktokSearchSourceKeyParams = {
  keyword: string;
  /** ISO 3166-1 alpha-2 code. */
  region: string;
};

/**
 * `sources.external_id` of a keyword search: `VN:vinhomes`. The keyword is
 * trimmed, NFC-normalized, lower-cased and has runs of whitespace collapsed;
 * diacritics stay because TikTok search tells "phí" and "phi" apart.
 */
export function buildTiktokSearchSourceKey(
  params: BuildTiktokSearchSourceKeyParams,
): string {
  const keyword = params.keyword
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!keyword) {
    throw new Error("A search source needs a keyword.");
  }

  return `${params.region.trim().toUpperCase()}:${keyword}`;
}

/** Inverse of `buildTiktokSearchSourceKey`. */
export function parseTiktokSearchSourceKey(
  key: string,
): BuildTiktokSearchSourceKeyParams | null {
  const separator = key.indexOf(":");
  if (separator !== 2) return null;

  const keyword = key.slice(separator + 1);
  return keyword ? { region: key.slice(0, separator), keyword } : null;
}
