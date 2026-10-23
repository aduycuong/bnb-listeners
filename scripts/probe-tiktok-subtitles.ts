// Probe TikTok subtitles as transcripts. Reads the archived TikHub payloads of
// the TikTok collect runs of each project (R2, no TikHub request), downloads
// the original-language WebVTT subtitle of each video from the TikTok CDN and
// reports:
//   - coverage: videos with a subtitle, which kind (ASR, creator, translation)
//   - size and download time of a subtitle
//   - the project's lexical match on the caption vs on the transcript, to see
//     how speech recognition spells project names
// Nothing is written to the DB. Results go to .local/experiments/.
//
// Example:
//   npx tsx scripts/probe-tiktok-subtitles.ts --max-videos 80
//   npx tsx scripts/probe-tiktok-subtitles.ts --project-id <uuid>

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { collectRuns, projectSources, sources } from "@/db/schema";
import { mapWithConcurrency } from "@/lib/common/map-with-concurrency";
import { readTiktokSubtitle } from "@/lib/connectors/tiktok/utils/read-tiktok-subtitle";
import { vttToText } from "@/lib/connectors/tiktok/utils/vtt-to-text";
import { rawPayloadStorage } from "@/lib/connectors/utils/raw-payload-storage";
import { db } from "@/lib/db";
import { loadProjectMatchContext } from "@/lib/matching/services/load-project-match-context";
import type { CompiledQuery } from "@/lib/matching/utils/compile-query";
import { lexicalHit } from "@/lib/matching/utils/plan-item-matches";

import { commandArgv } from "./script-argv";

const SCRIPT = "probe-tiktok-subtitles";
const CONCURRENCY = 4;

type Row = Record<string, unknown>;

const optionsSchema = z.object({
  projectId: z.uuid().optional(),
  maxVideos: z.coerce.number().int().min(1).max(500),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Measure TikTok subtitle coverage and quality from archived payloads.")
    .option("--project-id <uuid>", "Only this project")
    .option("--max-videos <n>", "Subtitles to download per project", "80");

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

function asRow(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;
}

function readVideoId(row: Row): string | null {
  const id = row.aweme_id ?? row.id;
  return typeof id === "string" && id ? id : null;
}

/** Every subtitle kind of a video, translations included, for the coverage counts. */
function countSubtitleKinds(row: Row, counts: Record<string, number>) {
  const video = asRow(row.video);
  for (const info of (asRow(video?.cla_info)?.caption_infos as Row[] | undefined) ?? []) {
    const kind = info.is_original_caption === false ? "translation" : info.is_auto_generated === false ? "creator" : "asr";
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  for (const info of (video?.subtitleInfos as Row[] | undefined) ?? []) {
    const kind = info.Source === "MT" ? "translation" : info.Source === "ASR" ? "asr" : "creator";
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
}

async function loadRecords(sourceIds: string[]): Promise<Row[]> {
  const runs = await db
    .select({ payloadKey: collectRuns.payloadKey })
    .from(collectRuns)
    .where(
      and(
        inArray(collectRuns.sourceId, sourceIds),
        inArray(collectRuns.connector, ["tiktok-search", "tiktok-posts"]),
        isNotNull(collectRuns.payloadKey),
      ),
    );

  const records = new Map<string, Row>();
  for (const run of runs) {
    const parsed: unknown = JSON.parse(await rawPayloadStorage.get(run.payloadKey!));
    for (const record of Array.isArray(parsed) ? parsed : [parsed]) {
      const row = asRow(record);
      const videoId = row ? readVideoId(row) : null;
      if (row && videoId && !records.has(videoId)) records.set(videoId, row);
    }
  }
  return [...records.values()];
}

function hitTerms(text: string, queries: CompiledQuery[]) {
  const hit = lexicalHit(text, queries);
  return [...(hit.certain?.terms ?? []), ...(hit.uncertain?.terms ?? [])];
}

async function probeProject(projectId: string, maxVideos: number) {
  const ctx = await loadProjectMatchContext({ projectId });
  if (ctx.sourceIds.length === 0) return null;
  const tiktokSourceIds = (
    await db
      .select({ id: sources.id })
      .from(sources)
      .where(and(eq(sources.platform, "tiktok"), inArray(sources.id, ctx.sourceIds)))
  ).map((row) => row.id);
  if (tiktokSourceIds.length === 0) return null;

  const records = await loadRecords(tiktokSourceIds);
  const kinds: Record<string, number> = {};
  for (const record of records) countSubtitleKinds(record, kinds);

  const withSubtitle = records.flatMap((record) => {
    const subtitle = readTiktokSubtitle(record);
    return subtitle ? [{ record, subtitle }] : [];
  });

  const fetched = await mapWithConcurrency(
    withSubtitle.slice(0, maxVideos),
    CONCURRENCY,
    async ({ record, subtitle }) => {
      const startedAt = Date.now();
      const caption = typeof record.desc === "string" ? record.desc : "";
      try {
        const response = await fetch(subtitle.url);
        const body = await response.text();
        const ms = Date.now() - startedAt;
        if (!response.ok) return { record, subtitle, ok: false as const, status: response.status, ms };
        const transcript = vttToText(body);
        return {
          record,
          subtitle,
          ok: true as const,
          ms,
          caption,
          transcript,
          captionTerms: hitTerms(caption, ctx.queries),
          transcriptTerms: hitTerms(transcript, ctx.queries),
        };
      } catch (error) {
        return { record, subtitle, ok: false as const, status: String(error), ms: Date.now() - startedAt };
      }
    },
  );

  const ok = fetched.flatMap((row) => (row.ok ? [row] : []));
  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

  const summary = {
    projectId,
    tiktokSources: tiktokSourceIds.length,
    videos: records.length,
    withOriginalSubtitle: withSubtitle.length,
    subtitleKinds: kinds,
    languages: withSubtitle.reduce<Record<string, number>>((counts, { subtitle }) => {
      const key = subtitle.language ?? "?";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
    downloaded: fetched.length,
    downloadFailed: fetched.flatMap((row) => (row.ok ? [] : [{ status: row.status }])),
    averageDownloadMs: average(ok.map((row) => row.ms)),
    maxDownloadMs: Math.max(0, ...ok.map((row) => row.ms)),
    averageTranscriptChars: average(ok.map((row) => row.transcript.length)),
    maxTranscriptChars: Math.max(0, ...ok.map((row) => row.transcript.length)),
    emptyTranscripts: ok.filter((row) => !row.transcript).length,
    match: {
      captionHit: ok.filter((row) => row.captionTerms.length > 0).length,
      transcriptHit: ok.filter((row) => row.transcriptTerms.length > 0).length,
      transcriptOnly: ok.filter((row) => !row.captionTerms.length && row.transcriptTerms.length).length,
      captionOnly: ok.filter((row) => row.captionTerms.length && !row.transcriptTerms.length).length,
    },
  };

  const samples = ok.map((row) => ({
    videoId: readVideoId(row.record),
    source: row.subtitle.source,
    language: row.subtitle.language,
    caption: row.caption.slice(0, 200),
    captionTerms: row.captionTerms,
    transcriptTerms: row.transcriptTerms,
    transcript: row.transcript,
  }));

  return { summary, samples };
}

async function main() {
  const options = parseArgs();
  console.log(`[${SCRIPT}] Options`, options);

  const projectIds = options.projectId
    ? [options.projectId]
    : [
        ...new Set(
          (
            await db
              .select({ projectId: projectSources.projectId })
              .from(projectSources)
              .innerJoin(sources, eq(sources.id, projectSources.sourceId))
              .where(eq(sources.platform, "tiktok"))
          ).map((row) => row.projectId),
        ),
      ];

  const results = [];
  for (const projectId of projectIds) {
    const result = await probeProject(projectId, options.maxVideos);
    if (!result) continue;
    console.log(`[${SCRIPT}] Summary`, JSON.stringify(result.summary, null, 2));
    results.push(result);
  }

  const dir = path.join(process.cwd(), ".local", "experiments");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `tiktok-subtitles-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(results, null, 2));
  console.log(`[${SCRIPT}] Wrote`, file);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
