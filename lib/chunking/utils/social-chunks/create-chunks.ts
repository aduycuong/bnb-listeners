import { buildContextPrefix } from "./build-context-prefix";
import { ATOMIC_MAX_CHARACTERS, SOCIAL_CONTENT_STRATEGY } from "./config";
import { splitContent } from "./split-content";
import type { ChunkablePart, CreateChunksParams, CreatedChunk } from "./types";

/**
 * Builds chunks from a document's eligible parts.
 *
 * Standalone by design — no database reads, no network calls — so it can be
 * driven from the pipeline, a script, or a test. Pass the result to
 * `createChunkRecords` to get insertable `chunks` rows.
 *
 * A text part is split into one or more text chunks (atomic when short).
 * Each media part becomes exactly one chunk whose content is the part's LLM
 * summary and whose `mediaUrl` points at the archived (R2) copy. Every chunk
 * gets the source context prefix so it stays self-contained once retrieved.
 */
export async function createChunks(
  params: CreateChunksParams,
): Promise<CreatedChunk[]> {
  const {
    parts,
    context,
    atomicMaxCharacters = ATOMIC_MAX_CHARACTERS,
  } = params;

  const contextPrefix = buildContextPrefix(context);
  const hasContextPrefix = contextPrefix.length > 0;
  const chunks: CreatedChunk[] = [];

  for (const part of parts) {
    if (part.contentType === "text") {
      const pieces = await splitContent({
        content: part.text,
        contextPrefixLength: contextPrefix.length,
        atomicMaxCharacters,
      });

      for (const [splitIndex, piece] of pieces.entries()) {
        chunks.push({
          chunkIndex: chunks.length,
          partId: part.partId,
          partScore: part.partScore,
          content: withContext(contextPrefix, piece),
          contentType: "text",
          mediaUrl: null,
          mediaMetadata: null,
          metadata: {
            strategy: SOCIAL_CONTENT_STRATEGY,
            contentType: "text",
            hasContextPrefix,
            partIndex: part.partIndex,
            splitIndex,
            splitCount: pieces.length,
          },
        });
      }

      continue;
    }

    const mediaChunk = buildMediaChunk(part, contextPrefix, chunks.length);
    if (mediaChunk) chunks.push(mediaChunk);
  }

  return chunks;
}

function buildMediaChunk(
  part: ChunkablePart,
  contextPrefix: string,
  chunkIndex: number,
): CreatedChunk | null {
  const text = part.text.trim();
  if (!text || !part.mediaUrl || part.contentType === "text") return null;

  return {
    chunkIndex,
    partId: part.partId,
    partScore: part.partScore,
    content: withContext(contextPrefix, text),
    contentType: part.contentType,
    mediaUrl: part.mediaUrl,
    mediaMetadata: {
      kind: part.contentType,
      url: part.mediaUrl,
      sourceUrl: part.sourceUrl,
    },
    metadata: {
      strategy: SOCIAL_CONTENT_STRATEGY,
      contentType: part.contentType,
      hasContextPrefix: contextPrefix.length > 0,
      partIndex: part.partIndex,
    },
  };
}

function withContext(prefix: string, text: string): string {
  return prefix ? `${prefix}\n\n${text}` : text;
}
