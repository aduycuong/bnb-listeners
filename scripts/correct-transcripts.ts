// Correct misheard names in stored transcripts against the entities of the
// projects that follow each source (D22): videos stored before correction
// existed, or after a project changed its entities or aliases. Transcripts
// already corrected with the same names are skipped. Then run match and
// enrich of the projects so they read the corrected text.
//
// Example:
//   npx tsx scripts/correct-transcripts.ts --project <uuid>
//   npm run transcripts:correct -- -- --project <uuid> --yes

import "dotenv/config";
import { Command } from "commander";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { projectSources } from "@/db/schema";
import { db } from "@/lib/db";
import { TRANSCRIPT_CORRECTION_CONFIG } from "@/lib/transcripts/config";
import { correctItemTranscripts } from "@/lib/transcripts/services/correct-item-transcripts";
import { listTranscriptItems } from "@/lib/transcripts/services/list-transcript-items";
import type { CorrectItemTranscriptsResult } from "@/lib/transcripts/types";

import { commandArgv } from "./script-argv";

const SCRIPT = "correct-transcripts";

const optionsSchema = z.object({
  project: z.uuid().optional(),
  sourceId: z.array(z.uuid()).optional(),
  yes: z.boolean(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Correct misheard names in stored transcripts.")
    .option("--project <uuid>", "Only sources this project follows")
    .option("--source-id <uuid...>", "Only these sources")
    .option("--yes", "Call the model and store the corrections", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  console.log(`[${SCRIPT}] Options`, { ...options, mode: options.yes ? "apply" : "dry-run" });

  const sourceIds = options.project
    ? (
        await db
          .select({ sourceId: projectSources.sourceId })
          .from(projectSources)
          .where(eq(projectSources.projectId, options.project))
      ).map((row) => row.sourceId)
    : options.sourceId;

  const itemIds = await listTranscriptItems({ sourceIds });
  const uncorrected = await listTranscriptItems({ sourceIds, uncorrectedOnly: true });
  console.log(`[${SCRIPT}] Items`, {
    withTranscript: itemIds.length,
    neverCorrected: uncorrected.length,
    model: TRANSCRIPT_CORRECTION_CONFIG.model,
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to correct (corrections with the same names are skipped).`);
    return;
  }

  const total: CorrectItemTranscriptsResult = { corrected: 0, unchanged: 0, current: 0, noGlossary: 0, failed: 0 };
  for (let offset = 0; offset < itemIds.length; offset += TRANSCRIPT_CORRECTION_CONFIG.itemsPerStep) {
    const batch = await correctItemTranscripts({
      itemIds: itemIds.slice(offset, offset + TRANSCRIPT_CORRECTION_CONFIG.itemsPerStep),
    });
    for (const key of Object.keys(total) as (keyof CorrectItemTranscriptsResult)[]) total[key] += batch[key];
  }

  console.log(`[${SCRIPT}] Result`, total);
  if (total.corrected > 0) {
    console.log(`[${SCRIPT}] Now run match and enrich of the projects that follow these sources.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, { error });
    process.exit(1);
  });
