/** TikTok timestamps are Unix seconds; 0 and missing values mean "unknown". */
export function fromUnixSeconds(value: number | null | undefined): Date | null {
  if (!value || value <= 0) return null;

  return new Date(value * 1000);
}
