import { putObjectToR2 } from "@/lib/r2/services/put-object-to-r2";
import { isR2Configured } from "@/lib/r2/utils/get-r2-s3-client";
import { normalizeContentType } from "@/lib/r2/utils/normalize-content-type";

import {
  MEDIA_DOWNLOAD_HEADERS,
  MEDIA_DOWNLOAD_TIMEOUT_MS,
  MEDIA_MAX_BYTES,
} from "../config";
import { MediaArchiveError } from "../media-archive-error";
import type { ArchiveMediaUrlParams, ArchiveMediaUrlResult } from "../types";
import { buildMediaObjectKey } from "../utils/build-media-object-key";

/**
 * Downloads a media URL and re-uploads it to R2 under a deterministic key.
 *
 * Scraped CDN URLs (Facebook fbcdn, …) are signed and expire within hours, so
 * anything that must read the media later — vision scoring, multimodal
 * embedding, manual re-score, the UI — reads the R2 copy instead.
 *
 * Throws MediaArchiveError with a stable code on any failure; the caller
 * decides whether that fails the whole document or just marks the part.
 */
export async function archiveMediaUrl(
  params: ArchiveMediaUrlParams,
): Promise<ArchiveMediaUrlResult> {
  if (!isR2Configured()) {
    throw new MediaArchiveError(
      "MEDIA_STORAGE_NOT_CONFIGURED",
      "R2 is not configured — set R2_* environment variables.",
    );
  }

  const { body, contentType } = await download(params.sourceUrl);

  const expectedPrefix = `${params.kind}/`;
  if (!contentType.startsWith(expectedPrefix)) {
    throw new MediaArchiveError(
      "MEDIA_UNSUPPORTED_TYPE",
      `Expected ${expectedPrefix}* but got "${contentType}".`,
    );
  }

  const maxBytes = MEDIA_MAX_BYTES[params.kind];
  if (body.byteLength > maxBytes) {
    throw new MediaArchiveError(
      "MEDIA_TOO_LARGE",
      `${body.byteLength} bytes exceeds the ${maxBytes} byte limit for ${params.kind}.`,
    );
  }

  if (body.byteLength === 0) {
    throw new MediaArchiveError("MEDIA_EMPTY", "Downloaded media is empty.");
  }

  const key = buildMediaObjectKey(params.keySegments, contentType);
  const stored = await putObjectToR2({ key, body, contentType });

  return {
    storageKey: stored.key,
    storageUrl: stored.publicUrl,
    contentType: stored.contentType,
    bytes: body.byteLength,
  };
}

async function download(
  sourceUrl: string,
): Promise<{ body: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_DOWNLOAD_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(sourceUrl, {
      headers: MEDIA_DOWNLOAD_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof Error && error.name === "AbortError") {
      throw new MediaArchiveError(
        "MEDIA_DOWNLOAD_TIMEOUT",
        `Download exceeded ${MEDIA_DOWNLOAD_TIMEOUT_MS}ms.`,
      );
    }

    throw new MediaArchiveError(
      "MEDIA_DOWNLOAD_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    if (!response.ok) {
      throw new MediaArchiveError(
        "MEDIA_DOWNLOAD_FAILED",
        `HTTP ${response.status} ${response.statusText}`,
      );
    }

    const contentType = normalizeContentType(
      response.headers.get("content-type") ?? "",
    );
    const body = Buffer.from(await response.arrayBuffer());

    return { body, contentType };
  } catch (error) {
    if (error instanceof MediaArchiveError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new MediaArchiveError(
        "MEDIA_DOWNLOAD_TIMEOUT",
        `Download exceeded ${MEDIA_DOWNLOAD_TIMEOUT_MS}ms.`,
      );
    }

    throw new MediaArchiveError(
      "MEDIA_DOWNLOAD_FAILED",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timer);
  }
}
