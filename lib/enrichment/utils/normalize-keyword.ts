/**
 * Key under which two keywords count as the same (D16): NFC, lowercase,
 * single spaces, no surrounding quotes, hashes or punctuation. Diacritics are
 * kept, since dropping them joins different words ("phí", "phi").
 */
export function normalizeKeyword(text: string): string {
  return text
    .normalize("NFC")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’#.,;:!?()[\]-]+|[\s"'“”‘’#.,;:!?()[\]-]+$/g, "");
}
