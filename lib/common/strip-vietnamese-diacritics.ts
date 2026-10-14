/** `Phát Đạt` → `Phat Dat`. Keeps case; use on NFC text. */
export function stripVietnameseDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFC");
}
