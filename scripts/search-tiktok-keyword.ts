// One-off keyword search without a publish-time window, to give a search source
// its first data. TikHub ranks all-time results by relevance, so a quiet keyword
// returns real videos here where the 24-hour window of the scheduled runs would
// return almost none. Videos of other regions are dropped and videos already
// stored are skipped. The scheduled runs keep their 24-hour window.
// TikHub bills per request (one per page), so --yes is needed.
//
// Example:
//   npx tsx scripts/search-tiktok-keyword.ts --keyword "trellia vista" --dry-run
//   npm run search:tiktok -- -- --keyword "trellia vista" --region VN --pages 5 --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { COLLECT_CONFIG } from "@/lib/connectors/config";
import { createCollectRun } from "@/lib/connectors/services/create-collect-run";
import { registerTiktokSearchSource } from "@/lib/connectors/services/register-tiktok-search-source";
import { commandArgv } from "./script-argv";

const SCRIPT = "search-tiktok-keyword";

const optionsSchema = z
  .object({
    keyword: z.string().trim().min(1),
    region: z.string().trim().length(2).optional(),
    pages: z.coerce.number().int().min(1).max(10),
    maxRecords: z.coerce.number().int().min(1).max(500).optional(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Search a TikTok keyword with no publish-time window and store the videos of one region.")
    .requiredOption("--keyword <text>", "Keyword to search")
    .option("--region <code>", "Search region, ISO country code (default VN)")
    .option("--pages <n>", "Pages to fetch, about 20 videos each (max 10)", "5")
    .option("--max-records <n>", "Hard cap on collected videos")
    .option("--dry-run", "Show what would run without writing", false)
    .option("--yes", "Register the source and start the run (TikHub bills per request)", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const region = (options.region ?? COLLECT_CONFIG.tiktok.search.region).toUpperCase();

  console.log(`[${SCRIPT}] Target`, {
    keyword: options.keyword,
    region,
    publishTimeDays: 0,
    pages: options.pages,
    maxRecords: options.maxRecords ?? "default",
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to start the search.`);
    return;
  }

  const registered = await registerTiktokSearchSource({ keyword: options.keyword, region });
  console.log(`[${SCRIPT}] Source`, registered);

  const run = await createCollectRun({
    connector: "tiktok-search",
    sourceId: registered.sourceId,
    params: {
      keyword: options.keyword,
      region,
      publishTimeDays: 0,
      pages: options.pages,
      ...(options.maxRecords !== undefined && { maxRecords: options.maxRecords }),
    },
  });
  console.log(`[${SCRIPT}] Collect run started`, run);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
