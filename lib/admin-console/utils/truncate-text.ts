const PREVIEW_LENGTH = 240;

/** Short preview of an item's text for list rows. */
export function truncateText(text: string, length = PREVIEW_LENGTH): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
