import { eq, inArray } from "drizzle-orm";

import { type ContentItemMedia, contentItems } from "@/db/schema";
import { mapWithConcurrency } from "@/lib/common/map-with-concurrency";
import { db } from "@/lib/db";
import { computeItemContentHash } from "@/lib/raw-store/utils/compute-item-content-hash";

import { TRANSCRIPT_CORRECTION_CONFIG } from "../config";
import type { CorrectItemTranscriptsResult } from "../types";
import { computeCorrectionSignature } from "../utils/compute-correction-signature";
import { correctTranscript } from "./correct-transcript";
import { loadSourceGlossaries } from "./load-source-glossaries";

type TranscriptMedia = Extract<ContentItemMedia, { type: "transcript" }>;

/**
 * Corrects the transcripts of some items against the glossary of their source
 * (D22) and stores the result with a new content hash, so Match and Enrich
 * read it. Always starts from the text as recognized. A transcript already
 * corrected with the same glossary is skipped; a failed call leaves the item
 * as it was and is counted, it never throws.
 */
export async function correctItemTranscripts(params: {
  itemIds: string[];
  dryRun?: boolean;
}): Promise<CorrectItemTranscriptsResult> {
  const result: CorrectItemTranscriptsResult = {
    corrected: 0,
    unchanged: 0,
    current: 0,
    noGlossary: 0,
    failed: 0,
  };
  if (params.itemIds.length === 0) return result;

  const items = await db
    .select({
      id: contentItems.id,
      sourceId: contentItems.sourceId,
      text: contentItems.text,
      media: contentItems.media,
    })
    .from(contentItems)
    .where(inArray(contentItems.id, params.itemIds));
  const glossaries = await loadSourceGlossaries(items.flatMap((item) => item.sourceId ?? []));

  await mapWithConcurrency(items, TRANSCRIPT_CORRECTION_CONFIG.concurrency, async (item) => {
    const index = item.media.findIndex((entry) => entry.type === "transcript");
    if (index < 0) return;
    const entry = item.media[index] as TranscriptMedia;

    const glossary = item.sourceId ? glossaries.get(item.sourceId) : undefined;
    if (!glossary?.length) {
      result.noGlossary++;
      return;
    }
    const signature = computeCorrectionSignature(glossary);
    if (entry.correction?.signature === signature) {
      result.current++;
      return;
    }

    const recognized = entry.rawText ?? entry.text;
    let corrected;
    try {
      corrected = await correctTranscript({ transcript: recognized, glossary, language: entry.language });
    } catch (error) {
      console.error("[transcripts] correction failed", { itemId: item.id, error: String(error) });
      result.failed++;
      return;
    }

    if (corrected.applied.length > 0) result.corrected++;
    else result.unchanged++;
    if (params.dryRun) return;

    const next: TranscriptMedia = {
      type: "transcript",
      url: entry.url,
      language: entry.language,
      source: entry.source,
      text: corrected.text,
      ...(corrected.text !== recognized && { rawText: recognized }),
      correction: {
        model: TRANSCRIPT_CORRECTION_CONFIG.model,
        signature,
        replacements: corrected.applied,
        correctedAt: new Date().toISOString(),
      },
    };
    const media = item.media.map((current, position) => (position === index ? next : current));
    await db
      .update(contentItems)
      .set({ media, contentHash: computeItemContentHash(item.text, media), updatedAt: new Date() })
      .where(eq(contentItems.id, item.id));
  });

  return result;
}
