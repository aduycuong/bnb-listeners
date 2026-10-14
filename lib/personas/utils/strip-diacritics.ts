/** Removes Vietnamese diacritics: "Chủ đầu tư" becomes "Chu dau tu". */
export function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
