// Add transcripts to TikTok videos stored before transcripts were collected,
// from the subtitle links in their archived payloads (no TikHub request). The
// links expire about 30 days after a run, so older videos get nothing. Then
// run match and enrich of the project so they read the transcripts.
//
// Example:
//   npx tsx scripts/backfill-tiktok-transcripts.ts
//   npm run backfill:tiktok-transcripts -- -- --source-id <uuid> --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { backfillTiktokTranscripts } from "@/lib/connectors/tiktok/services/backfill-tiktok-transcripts";

import { commandArgv } from "./script-argv";

const SCRIPT = "backfill-tiktok-transcripts";

const optionsSchema = z.object({
  sourceId: z.array(z.uuid()).optional(),
  replace: z.boolean(),
  yes: z.boolean(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Add transcripts to stored TikTok videos from their archived payloads.")
    .option("--source-id <uuid...>", "Only runs of these sources")
    .option("--replace", "Also replace transcripts already stored", false)
    .option("--yes", "Archive the subtitles and update the videos", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  console.log(`[${SCRIPT}] Options`, { ...options, mode: options.yes ? "apply" : "dry-run" });

  const result = await backfillTiktokTranscripts({
    sourceIds: options.sourceId,
    replace: options.replace,
    dryRun: !options.yes,
  });

  console.log(`[${SCRIPT}] Result`, result);
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to apply.`);
  } else if (result.updated > 0) {
    console.log(`[${SCRIPT}] Now run match and enrich of the projects that follow these sources.`);
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
