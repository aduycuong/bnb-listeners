/**
 * Strips a leading slash and rejects path traversal. Returns null when the key
 * is unusable so callers can decide between throwing and skipping.
 */
export function normalizeObjectKey(key: string): string | null {
  const objectKey = key.trim().replace(/^\//, "");
  if (!objectKey || objectKey.includes("..")) {
    return null;
  }

  return objectKey;
}
