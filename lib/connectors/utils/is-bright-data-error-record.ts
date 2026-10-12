/** With `include_errors=true` Bright Data mixes error rows into the result. */
export function isBrightDataErrorRecord(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.error === "string" || typeof record.error_code === "string";
}
