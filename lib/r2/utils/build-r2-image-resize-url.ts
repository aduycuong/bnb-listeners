export type BuildR2ImageResizeUrlOptions = {
  width: number;
  quality?: number;
  format?: "auto" | "webp" | "jpeg" | "png";
};

/**
 * Routes a public R2 URL through Cloudflare Image Resizing so vision models
 * receive a bounded-size image instead of the original upload.
 */
export function buildR2ImageResizeUrl(
  publicUrl: string,
  options: BuildR2ImageResizeUrlOptions,
): string {
  const url = new URL(publicUrl);
  const path = url.pathname.replace(/^\//, "");
  const quality = options.quality ?? 85;
  const format = options.format ?? "auto";

  url.pathname = `/cdn-cgi/image/width=${options.width},quality=${quality},format=${format}/${path}`;

  return url.toString();
}

/**
 * Width from R2_IMAGE_RESIZE_WIDTH; `0` / `false` disables resizing.
 * Defaults to 1568, the long edge most vision models downscale to anyway.
 */
export function getR2VisionImageResizeWidth(): number | null {
  const raw = process.env.R2_IMAGE_RESIZE_WIDTH?.trim();

  if (raw === "0" || raw === "false") {
    return null;
  }

  const parsed = Number.parseInt(raw ?? "1568", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1568;
  }

  return parsed;
}

export function buildR2VisionImageUrl(publicUrl: string): string {
  const width = getR2VisionImageResizeWidth();

  if (width === null) {
    return publicUrl;
  }

  return buildR2ImageResizeUrl(publicUrl, { width });
}
