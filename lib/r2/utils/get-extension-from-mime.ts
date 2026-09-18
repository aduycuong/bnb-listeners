const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/avif": "avif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
  "video/x-msvideo": "avi",
};

export function getExtensionFromMime(mime: string): string {
  const base = mime.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  return EXTENSION_BY_MIME[base] ?? "bin";
}
