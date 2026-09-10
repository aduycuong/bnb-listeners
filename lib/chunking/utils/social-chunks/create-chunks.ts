import { buildContextPrefix } from "./build-context-prefix";
import { buildMediaSnippet } from "./build-media-snippet";
import {
  ATOMIC_MAX_CHARACTERS,
  MAX_MEDIA_PER_KIND,
  MEDIA_FALLBACK_TEXT,
  SOCIAL_CONTENT_STRATEGY,
} from "./config";
import { normalizeMediaUrls } from "./normalize-media-urls";
import { splitContent } from "./split-content";
import type { CreateChunksParams, CreatedChunk, MediaKind } from "./types";

/**
 * Builds chunks from raw social content plus its image and video URLs.
 *
 * Standalone by design — no database reads, no network calls, no document
 * lookup — so it can be driven from a job handler, a script, or a test.
 * Pass the result to `createChunkRecords` to get insertable `chunks` rows.
 *
 * Text is treated as an atomic unit; each image and video becomes its own chunk
 * carrying `mediaUrl`, paired with a snippet of the post text. Every chunk gets
 * the source context prefix so it stays self-contained once retrieved.
 */
export async function createChunks(
  params: CreateChunksParams,
): Promise<CreatedChunk[]> {
  const {
    content,
    imageUrls,
    videoUrls,
    context,
    atomicMaxCharacters = ATOMIC_MAX_CHARACTERS,
    maxMediaPerKind = MAX_MEDIA_PER_KIND,
  } = params;

  const contextPrefix = buildContextPrefix(context);
  const hasContextPrefix = contextPrefix.length > 0;
  const chunks: CreatedChunk[] = [];

  const textParts = await splitContent({
    content,
    contextPrefixLength: contextPrefix.length,
    atomicMaxCharacters,
  });

  for (const [partIndex, part] of textParts.entries()) {
    chunks.push({
      chunkIndex: chunks.length,
      content: withContext(contextPrefix, part),
      contentType: "text",
      mediaUrl: null,
      mediaMetadata: null,
      metadata: {
        strategy: SOCIAL_CONTENT_STRATEGY,
        contentType: "text",
        hasContextPrefix,
        partIndex,
        partCount: textParts.length,
      },
    });
  }

  const snippet = buildMediaSnippet(content);

  function pushMediaChunks(kind: MediaKind, urls: string[]): void {
    const text = snippet || MEDIA_FALLBACK_TEXT[kind];

    for (const [index, url] of urls.entries()) {
      chunks.push({
        chunkIndex: chunks.length,
        content: withContext(contextPrefix, text),
        contentType: kind,
        mediaUrl: url,
        mediaMetadata: { kind, url, index, count: urls.length },
        metadata: {
          strategy: SOCIAL_CONTENT_STRATEGY,
          contentType: kind,
          hasContextPrefix,
        },
      });
    }
  }

  pushMediaChunks("image", normalizeMediaUrls(imageUrls, maxMediaPerKind));
  pushMediaChunks("video", normalizeMediaUrls(videoUrls, maxMediaPerKind));

  return chunks;
}

function withContext(prefix: string, text: string): string {
  return prefix ? `${prefix}\n\n${text}` : text;
}
