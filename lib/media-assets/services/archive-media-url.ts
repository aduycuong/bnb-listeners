import { putObjectToR2 } from "@/lib/r2/services/put-object-to-r2";
import { isR2Configured } from "@/lib/r2/utils/get-r2-s3-client";
import { normalizeContentType } from "@/lib/r2/utils/normalize-content-type";

import {
  MEDIA_DOWNLOAD_ATTEMPTS,
  MEDIA_DOWNLOAD_HEADERS,
  MEDIA_DOWNLOAD_RETRY_DELAYS_MS,
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
  let lastError: unknown;

  for (let attempt = 1; attempt <= MEDIA_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      return await downloadOnce(sourceUrl);
    } catch (error) {
      lastError = error;
      if (
        attempt === MEDIA_DOWNLOAD_ATTEMPTS ||
        !isRetryableDownloadError(error)
      ) {
        throw error;
      }

      const delay =
        MEDIA_DOWNLOAD_RETRY_DELAYS_MS[attempt - 1] ??
        MEDIA_DOWNLOAD_RETRY_DELAYS_MS.at(-1) ??
        800;

      console.warn(
        `[archive-media-url] attempt ${attempt}/${MEDIA_DOWNLOAD_ATTEMPTS} failed (${describeDownloadError(error)}); retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

async function downloadOnce(
  sourceUrl: string,
): Promise<{ body: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MEDIA_DOWNLOAD_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(sourceUrl, {
      headers: MEDIA_DOWNLOAD_HEADERS,
      redirect: "follow",
      cache: "no-store",
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
      describeDownloadError(error),
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
      describeDownloadError(error),
    );
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableDownloadError(error: unknown): boolean {
  if (!(error instanceof MediaArchiveError)) return false;
  if (error.code !== "MEDIA_DOWNLOAD_FAILED") return false;

  if (/^HTTP (429|502|503|504)\b/.test(error.message)) return true;

  // Node/undici surfaces connection resets, IPv6 failures, and TLS
  // handshake drops as TypeError("fetch failed") — not as HTTP status.
  return !error.message.startsWith("HTTP ");
}

function describeDownloadError(error: unknown): string {
  if (error instanceof MediaArchiveError) return error.message;
  if (!(error instanceof Error)) return String(error);

  const cause = error.cause;
  if (cause instanceof Error) {
    const code =
      "code" in cause && typeof cause.code === "string" ? cause.code : null;
    return code
      ? `${error.message} (${code}: ${cause.message})`
      : `${error.message} (${cause.message})`;
  }

  return error.message;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
