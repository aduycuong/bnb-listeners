/**
 * Cheap rule-based noise filter run before the LLM batch.
 *
 * Catches the high-volume Vietnamese social noise that would otherwise waste
 * tokens and dilute debate tallies. Anything that survives still goes to the
 * LLM — length alone is not enough to decide substance ("lừa đảo đấy" is short
 * but substantive).
 */
const EMOJI_OR_PUNCT_ONLY =
  /^[\s\p{Extended_Pictographic}\p{P}\p{S}\d+_+=.]*$/u;

const NOISE_EXACT = new Set(
  [
    "hóng",
    "hong",
    "quan tâm",
    "quan tam",
    "quan tâm ạ",
    "ib",
    "inbox",
    "ib giá",
    "ib e",
    "ad ơi",
    "admin ơi",
    "ad oi",
    "+1",
    "like",
    "follow",
    "fl",
    "up",
    "hú",
    "hiu",
    "me",
    "em",
    "ok",
    "oke",
    "okay",
    "yes",
    "no",
    "đúng",
    "dung",
    "đúng rồi",
    "dung roi",
    "chuẩn",
    "chuan",
    "hay",
    "hay quá",
    "hay qua",
    "đỉnh",
    "dinh",
    "top",
    "clm",
    "vcl",
    "vl",
  ].map((s) => s.toLowerCase()),
);

export function isNoiseComment(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length <= 1) return true;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");

  if (NOISE_EXACT.has(normalized)) return true;
  if (EMOJI_OR_PUNCT_ONLY.test(trimmed)) return true;

  // Pure @mentions / tag-only comments
  if (/^(@\w+\s*)+$/u.test(trimmed)) return true;

  return false;
}
