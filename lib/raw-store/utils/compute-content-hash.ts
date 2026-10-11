import { createHash } from "node:crypto";

/**
 * sha256 of the text after Unicode NFC and whitespace collapsing, so a
 * re-collected item with only formatting changes keeps the same hash.
 */
export function computeContentHash(text: string): string {
  const normalized = text.normalize("NFC").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}
