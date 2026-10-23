// Probe the LLM correction of transcripts before wiring it into collection.
// Corrects the stored transcripts of a project's videos against the names and
// aliases of the project's entities, once per model, and reports for each:
//   - replacements suggested, applied, and dropped by the checks (and why)
//   - the project's lexical match on the transcript before and after
//   - entities in a corrected transcript but not in the caption, the place
//     where a name could have been inserted; counted after the checks and
//     as if every suggestion that names a glossary entry had been applied
// Nothing is written to the DB. Results go to .local/experiments/.
//
// Example:
//   npx tsx scripts/probe-transcript-correction.ts --project <uuid> --max-videos 20
//   npx tsx scripts/probe-transcript-correction.ts --project <uuid> --model gpt-4.1-mini --model gemini-3.6-flash

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { contentItems, projectEntities } from "@/db/schema";
import { mapWithConcurrency } from "@/lib/common/map-with-concurrency";
import { db } from "@/lib/db";
import { chatModelIdSchema } from "@/lib/langchain";
import { loadProjectMatchContext } from "@/lib/matching/services/load-project-match-context";
import type { CompiledQuery } from "@/lib/matching/utils/compile-query";
import { lexicalHit } from "@/lib/matching/utils/plan-item-matches";
import { getTranscriptText } from "@/lib/raw-store/utils/get-transcript-text";
import { TRANSCRIPT_CORRECTION_CONFIG } from "@/lib/transcripts/config";
import { correctTranscript } from "@/lib/transcripts/services/correct-transcript";

import { commandArgv } from "./script-argv";

const SCRIPT = "probe-transcript-correction";
const CONCURRENCY = 4;

const optionsSchema = z.object({
  project: z.uuid(),
  maxVideos: z.coerce.number().int().min(1).max(500),
  model: z.array(chatModelIdSchema).min(1),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Measure the LLM correction of stored transcripts.")
    .requiredOption("--project <uuid>", "Project id")
    .option("--max-videos <n>", "Transcripts to correct", "200")
    .option(
      "--model <id>",
      "Model to compare; repeat the flag for several",
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    );

  program.parse(commandArgv());
  const options = program.opts();
  return optionsSchema.parse({
    ...options,
    model: options.model.length ? options.model : [TRANSCRIPT_CORRECTION_CONFIG.model],
  });
}

function entityHits(text: string, queries: CompiledQuery[]): string[] {
  const hit = lexicalHit(text, queries);
  return [...new Set([...(hit.certain?.entityIds ?? []), ...(hit.uncertain?.entityIds ?? [])])];
}

function count(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const options = parseArgs();
  const ctx = await loadProjectMatchContext({ projectId: options.project });
  const entities = await db
    .select({ id: projectEntities.id, name: projectEntities.name, aliases: projectEntities.aliases })
    .from(projectEntities)
    .where(eq(projectEntities.projectId, options.project))
    .orderBy(asc(projectEntities.sortOrder));
  const glossary = entities.map((entity) => ({ name: entity.name, aliases: entity.aliases }));
  const entityName = new Map(entities.map((entity) => [entity.id, entity.name]));
  console.log(`[${SCRIPT}] Glossary`, glossary);

  const videos = (
    await db
      .select({ externalId: contentItems.externalId, text: contentItems.text, media: contentItems.media })
      .from(contentItems)
      .where(
        and(
          inArray(contentItems.sourceId, ctx.sourceIds),
          eq(contentItems.platform, "tiktok"),
          eq(contentItems.kind, "post"),
          sql`exists (select 1 from jsonb_array_elements(${contentItems.media}) m where m->>'type' = 'transcript')`,
        ),
      )
      .orderBy(asc(contentItems.externalId))
  ).slice(0, options.maxVideos);

  const names = (ids: string[]) => ids.map((id) => entityName.get(id) ?? id);
  const reports = [];

  for (const model of options.model) {
    const startedAt = Date.now();
    const results = await mapWithConcurrency(videos, CONCURRENCY, async (video) => {
      const transcript = getTranscriptText(video.media);
      const language = video.media.find((entry) => entry.type === "transcript")?.language ?? null;
      try {
        return { video, transcript, result: await correctTranscript({ transcript, glossary, language, model }), error: null };
      } catch (error) {
        return { video, transcript, result: null, error: String(error).slice(0, 300) };
      }
    });

    const rows = results.map(({ video, transcript, result, error }) => {
      const caption = entityHits(video.text, ctx.queries);
      const after = entityHits(result?.text ?? transcript, ctx.queries);
      // As if the checks were off: every suggestion naming a glossary entry applied.
      let unchecked = transcript;
      const uncheckedEntries = [
        ...(result?.applied ?? []),
        ...(result?.dropped ?? []).filter((entry) => entry.reason !== "not a glossary name"),
      ];
      for (const entry of uncheckedEntries) unchecked = unchecked.split(entry.from).join(entry.to);
      const uncheckedHits = entityHits(unchecked, ctx.queries);
      return {
        videoId: video.externalId,
        caption: video.text.slice(0, 160),
        error,
        suggested: result?.suggested ?? 0,
        applied: result?.applied ?? [],
        dropped: result?.dropped ?? [],
        captionEntities: names(caption),
        transcriptEntitiesBefore: names(entityHits(transcript, ctx.queries)),
        transcriptEntitiesAfter: names(after),
        entitiesNotInCaption: names(after.filter((id) => !caption.includes(id))),
        entitiesNotInCaptionUnchecked: names(uncheckedHits.filter((id) => !caption.includes(id))),
        corrected: result?.applied.length ? result.text : null,
        original: transcript,
      };
    });

    const summary = {
      model,
      videos: rows.length,
      seconds: Math.round((Date.now() - startedAt) / 1000),
      errors: rows.filter((row) => row.error).length,
      suggested: rows.reduce((sum, row) => sum + row.suggested, 0),
      applied: rows.reduce((sum, row) => sum + row.applied.length, 0),
      dropped: count(rows.flatMap((row) => row.dropped.map((entry) => entry.reason))),
      videosCorrected: rows.filter((row) => row.applied.length > 0).length,
      captionHit: rows.filter((row) => row.captionEntities.length > 0).length,
      transcriptHitBefore: rows.filter((row) => row.transcriptEntitiesBefore.length > 0).length,
      transcriptHitAfter: rows.filter((row) => row.transcriptEntitiesAfter.length > 0).length,
      entityNotInCaption: rows.filter((row) => row.entitiesNotInCaption.length > 0).length,
      entityNotInCaptionUnchecked: rows.filter((row) => row.entitiesNotInCaptionUnchecked.length > 0).length,
    };
    console.log(`[${SCRIPT}] Summary`, summary);
    console.log(
      `[${SCRIPT}] Dropped as not alike (${model})`,
      [...new Set(rows.flatMap((row) => row.dropped.filter((entry) => entry.reason === "not alike").map((entry) => `${entry.from} → ${entry.to}`)))],
    );
    reports.push({ summary, rows });
  }

  const dir = path.join(process.cwd(), ".local", "experiments");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `transcript-correction-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(reports, null, 2));
  console.log(`[${SCRIPT}] Wrote`, file);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, { error });
    process.exit(1);
  });
