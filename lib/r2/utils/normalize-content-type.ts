export function normalizeContentType(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "application/octet-stream";
  const base = trimmed.split(";")[0]?.trim().toLowerCase() ?? "";
  return base || "application/octet-stream";
}
