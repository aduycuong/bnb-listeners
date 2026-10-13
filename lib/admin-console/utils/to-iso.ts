/** ISO string of a date column; null stays null. */
export function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
