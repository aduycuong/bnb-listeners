/** Numbers up to this are counts the text may use freely ("3 chủ đề", "2 tuần"). */
const FREE_MAX = 10;

const DATE_PATTERN = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;
const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/g;
const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/g;

function key(value: number) {
  return Math.abs(value).toFixed(1);
}

/** `34.260` and `34260` → 34260; `15,2` and `15.2` → 15.2 (Vietnamese or plain formatting). */
export function parseReportNumber(token: string): number {
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(token)) {
    return Number(token.replace(/\./g, "").replace(",", "."));
  }
  return Number(token.replace(",", "."));
}

/** Every number of a facts object, rounded to whole and one decimal, sign dropped. */
export function collectFactNumbers(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "number" && Number.isFinite(value)) {
    out.add(key(value));
    out.add(key(Math.round(value)));
    out.add(key(Math.round(value * 10) / 10));
  } else if (Array.isArray(value)) {
    for (const item of value) collectFactNumbers(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectFactNumbers(item, out);
  }
  return out;
}

/** Numbers of `text` that are not in the facts (D29); dates, years and small counts are let through. */
export function findUnknownNumbers(text: string, facts: Set<string>): string[] {
  const cleaned = text.replace(DATE_PATTERN, " ").replace(YEAR_PATTERN, " ");
  const unknown = new Set<string>();
  for (const token of cleaned.match(NUMBER_PATTERN) ?? []) {
    const value = parseReportNumber(token);
    if (!Number.isFinite(value) || value <= FREE_MAX) continue;
    if (!facts.has(key(value))) unknown.add(token);
  }
  return [...unknown];
}
