import { stripVietnameseDiacritics } from "@/lib/common/strip-vietnamese-diacritics";

export type TextToken = {
  /** As written (NFC). */
  raw: string;
  /** Lowercase, diacritics kept. */
  lower: string;
  /** Lowercase without diacritics. */
  plain: string;
};

/** Splits on anything that is not a letter or digit, so punctuation and emoji are word boundaries. */
export function tokenizeText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  for (const match of text.normalize("NFC").matchAll(/[\p{L}\p{N}]+/gu)) {
    const raw = match[0];
    const lower = raw.toLocaleLowerCase("vi");
    tokens.push({ raw, lower, plain: stripVietnameseDiacritics(lower) });
  }
  return tokens;
}
