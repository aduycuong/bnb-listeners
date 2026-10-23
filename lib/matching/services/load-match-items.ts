import { and, inArray, type SQL } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";
import { getTranscriptText } from "@/lib/raw-store/utils/get-transcript-text";

import type { MatchItem } from "../types";

const columns = {
  id: contentItems.id,
  kind: contentItems.kind,
  rootId: contentItems.rootId,
  text: contentItems.text,
  media: contentItems.media,
  contentHash: contentItems.contentHash,
  platform: contentItems.platform,
  sourceId: contentItems.sourceId,
  authorId: contentItems.authorId,
  publishedAt: contentItems.publishedAt,
  origin: contentItems.origin,
  collectRunId: contentItems.collectRunId,
};

/** Items of the given sources matching `where`. */
export async function loadMatchItems(params: {
  sourceIds: string[];
  where?: SQL;
}): Promise<MatchItem[]> {
  if (params.sourceIds.length === 0) return [];
  const rows = await db
    .select(columns)
    .from(contentItems)
    .where(and(inArray(contentItems.sourceId, params.sourceIds), params.where));
  return rows.map(({ media, ...row }) => ({ ...row, transcript: getTranscriptText(media) }));
}
