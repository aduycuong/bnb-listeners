import { and, eq, inArray } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { mapWithConcurrency } from "@/lib/common/map-with-concurrency";
import { db } from "@/lib/db";
import { putObjectToR2 } from "@/lib/r2/services/put-object-to-r2";

import { COLLECT_CONFIG } from "../../config";
import type { TiktokTranscript } from "../schema";
import { readTiktokSubtitle, type TiktokSubtitleRef } from "../utils/read-tiktok-subtitle";
import { vttToText } from "../utils/vtt-to-text";

type AttachTiktokTranscriptsParams = {
  /** Raw TikHub videos; each one that gets a transcript gains a `transcript` field. */
  records: Record<string, unknown>[];
  /** Downloads stop, without failing the run, once this instant has passed. */
  deadlineAt?: number;
  /** Also download for videos already stored (the backfill script). */
  includeStored?: boolean;
  fetchText?: (url: string) => Promise<string>;
  storeFile?: (key: string, body: string) => Promise<string>;
  now?: () => number;
};

export type AttachTiktokTranscriptsResult = {
  attached: number;
  /** New videos without an original-language subtitle. */
  missing: number;
  failed: number;
  /** Stored videos left alone; their transcript, if any, is already stored. */
  stored: number;
  /** Not tried because the run budget ran out. */
  outOfBudget: number;
  /** Transcripts kept without their R2 copy. */
  notArchived: number;
};

function readVideoId(record: Record<string, unknown>): string | null {
  const id = record.aweme_id ?? record.id;
  return typeof id === "string" && id ? id : null;
}

async function fetchSubtitleText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(COLLECT_CONFIG.tiktok.transcripts.downloadTimeoutMs),
  });
  if (!response.ok) throw new Error(`Subtitle download failed with HTTP ${response.status}.`);
  return response.text();
}

async function storeSubtitleFile(key: string, body: string): Promise<string> {
  const result = await putObjectToR2({
    key,
    body: Buffer.from(body, "utf8"),
    contentType: "text/vtt",
  });
  return result.publicUrl;
}

async function findStoredVideoIds(videoIds: string[]): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const rows = await db
    .select({ externalId: contentItems.externalId })
    .from(contentItems)
    .where(and(eq(contentItems.platform, "tiktok"), inArray(contentItems.externalId, videoIds)));
  return new Set(rows.map((row) => row.externalId));
}

/**
 * Downloads the subtitle of each new video and adds it to the record as
 * `transcript`, so normalize can store it and the archived payload keeps it.
 * The subtitle link expires about 30 days after the fetch, so this happens
 * while fetching, and the file is copied to R2. A failure only leaves that
 * video without a transcript; it never fails the run.
 */
export async function attachTiktokTranscripts(
  params: AttachTiktokTranscriptsParams,
): Promise<AttachTiktokTranscriptsResult> {
  const config = COLLECT_CONFIG.tiktok.transcripts;
  const fetchText = params.fetchText ?? fetchSubtitleText;
  const storeFile = params.storeFile ?? storeSubtitleFile;
  const now = params.now ?? Date.now;
  const result: AttachTiktokTranscriptsResult = {
    attached: 0,
    missing: 0,
    failed: 0,
    stored: 0,
    outOfBudget: 0,
    notArchived: 0,
  };

  const storedIds = params.includeStored
    ? new Set<string>()
    : await findStoredVideoIds(params.records.flatMap((record) => readVideoId(record) ?? []));

  const jobs: { record: Record<string, unknown>; videoId: string; subtitle: TiktokSubtitleRef }[] = [];
  for (const record of params.records) {
    const videoId = readVideoId(record);
    if (!videoId) continue;
    if (storedIds.has(videoId)) {
      result.stored++;
      continue;
    }
    const subtitle = readTiktokSubtitle(record);
    if (!subtitle) {
      result.missing++;
      continue;
    }
    jobs.push({ record, videoId, subtitle });
  }

  await mapWithConcurrency(jobs, config.concurrency, async ({ record, videoId, subtitle }) => {
    if (params.deadlineAt !== undefined && now() > params.deadlineAt) {
      result.outOfBudget++;
      return;
    }

    let vtt: string;
    try {
      vtt = await fetchText(subtitle.url);
    } catch (error) {
      console.warn("[tiktok] subtitle download failed", { videoId, error: String(error) });
      result.failed++;
      return;
    }

    const text = vttToText(vtt).slice(0, config.maxChars);
    if (!text) {
      result.missing++;
      return;
    }

    let url: string | null = null;
    try {
      url = await storeFile(`${config.objectKeyPrefix}/${videoId}.vtt`, vtt);
    } catch (error) {
      console.warn("[tiktok] subtitle archive failed", { videoId, error: String(error) });
      result.notArchived++;
    }

    const transcript: TiktokTranscript = {
      text,
      language: subtitle.language,
      source: subtitle.source,
      url,
    };
    record.transcript = transcript;
    result.attached++;
  });

  return result;
}
