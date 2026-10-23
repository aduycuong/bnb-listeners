import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { collectRuns, type ContentItemMedia, contentItems } from "@/db/schema";
import { db } from "@/lib/db";
import { computeItemContentHash } from "@/lib/raw-store/utils/compute-item-content-hash";

import { rawPayloadStorage } from "../../utils/raw-payload-storage";
import { type TiktokTranscript, tiktokTranscriptSchema } from "../schema";
import { attachTiktokTranscripts, type AttachTiktokTranscriptsResult } from "./attach-tiktok-transcripts";

type BackfillTiktokTranscriptsParams = {
  /** Only runs of these sources; all TikTok post runs when omitted. */
  sourceIds?: string[];
  /** Videos that already have a transcript are skipped unless set. */
  replace?: boolean;
  dryRun: boolean;
};

export type BackfillTiktokTranscriptsResult = {
  runs: number;
  videos: number;
  /** Stored videos that already had a transcript. */
  alreadyTranscribed: number;
  download: AttachTiktokTranscriptsResult;
  updated: number;
};

type Row = Record<string, unknown>;

function readVideoId(record: Row): string | null {
  const id = record.aweme_id ?? record.id;
  return typeof id === "string" && id ? id : null;
}

/**
 * Adds transcripts to TikTok videos stored before transcripts were collected,
 * from the subtitle links in their archived payloads. Those links expire about
 * 30 days after the run, so older videos get nothing. Only `media` and
 * `content_hash` change; the new hash makes the next match and enrich of the
 * project read the transcript.
 */
export async function backfillTiktokTranscripts(
  params: BackfillTiktokTranscriptsParams,
): Promise<BackfillTiktokTranscriptsResult> {
  const runs = await db
    .select({ payloadKey: collectRuns.payloadKey })
    .from(collectRuns)
    .where(
      and(
        inArray(collectRuns.connector, ["tiktok-search", "tiktok-posts"]),
        isNotNull(collectRuns.payloadKey),
        params.sourceIds ? inArray(collectRuns.sourceId, params.sourceIds) : undefined,
      ),
    );

  const records = new Map<string, Row>();
  for (const run of runs) {
    const parsed: unknown = JSON.parse(await rawPayloadStorage.get(run.payloadKey!));
    for (const record of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!record || typeof record !== "object") continue;
      const videoId = readVideoId(record as Row);
      if (videoId && !records.has(videoId)) records.set(videoId, record as Row);
    }
  }

  const stored = records.size
    ? await db
        .select({
          id: contentItems.id,
          externalId: contentItems.externalId,
          text: contentItems.text,
          media: contentItems.media,
        })
        .from(contentItems)
        .where(
          and(eq(contentItems.platform, "tiktok"), inArray(contentItems.externalId, [...records.keys()])),
        )
    : [];

  const hasTranscript = (media: ContentItemMedia[]) => media.some((entry) => entry.type === "transcript");
  const targets = stored.filter((row) => params.replace || !hasTranscript(row.media));
  const targetRecords = targets.flatMap((row) => {
    const record = records.get(row.externalId);
    // Copies: the archived payload itself is never rewritten.
    return record ? [{ ...record }] : [];
  });

  const download = await attachTiktokTranscripts({
    records: targetRecords,
    includeStored: true,
    ...(params.dryRun && { storeFile: async () => "" }),
  });

  const transcripts = new Map<string, TiktokTranscript>();
  for (const record of targetRecords) {
    const parsed = tiktokTranscriptSchema.safeParse(record.transcript);
    const videoId = readVideoId(record);
    if (parsed.success && videoId) transcripts.set(videoId, parsed.data);
  }

  let updated = 0;
  for (const row of targets) {
    const transcript = transcripts.get(row.externalId);
    if (!transcript) continue;
    const media: ContentItemMedia[] = [
      ...row.media.filter((entry) => entry.type !== "transcript"),
      {
        type: "transcript",
        url: transcript.url || null,
        text: transcript.text,
        language: transcript.language ?? null,
        source: transcript.source,
      },
    ];
    if (!params.dryRun) {
      await db
        .update(contentItems)
        .set({ media, contentHash: computeItemContentHash(row.text, media), updatedAt: new Date() })
        .where(eq(contentItems.id, row.id));
    }
    updated++;
  }

  return {
    runs: runs.length,
    videos: stored.length,
    alreadyTranscribed: stored.length - targets.length,
    download,
    updated,
  };
}
