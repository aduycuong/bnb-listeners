// Register a TikTok channel (--url) or keyword search (--keyword) as a raw-store
// source and start a collection (collect-source workflow). A channel run asks
// for videos since the newest stored video minus the overlap in
// lib/connectors/config.ts, or the initial lookback for a new source; --since
// overrides it. A keyword search reads a fixed publish-time window, so --since
// does not apply. Comments are not collected here; new videos get comment-refresh
// schedules (npm run refresh:check). TikHub bills per request, so --yes is needed.
//
// Example:
//   npx tsx scripts/collect-tiktok-source.ts --url https://www.tiktok.com/@cochikimvn --dry-run
//   npx tsx scripts/collect-tiktok-source.ts --url https://www.tiktok.com/@cochikimvn --yes
//   npm run collect:tiktok -- -- --keyword vinhomes --region VN --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { collectSource } from "@/lib/connectors/services/collect-source";
import { registerTiktokSearchSource } from "@/lib/connectors/services/register-tiktok-search-source";
import { registerTiktokSource } from "@/lib/connectors/services/register-tiktok-source";
import { parseTiktokSourceUrl } from "@/lib/connectors/tiktok/utils/parse-tiktok-source-url";
import { commandArgv } from "./script-argv";

const SCRIPT = "collect-tiktok-source";

const optionsSchema = z
  .object({
    url: z
      .string()
      .refine((value) => parseTiktokSourceUrl(value) !== null, {
        message: "--url must be a TikTok channel URL (https://www.tiktok.com/@name).",
      })
      .optional(),
    keyword: z.string().trim().min(1).optional(),
    region: z.string().trim().length(2).optional(),
    since: z.iso.datetime({ offset: true }).optional(),
    maxRecords: z.coerce.number().int().min(1).max(5000).optional(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  })
  .refine((value) => (value.url === undefined) !== (value.keyword === undefined), {
    message: "Give exactly one of --url or --keyword.",
  })
  .refine((value) => !(value.keyword !== undefined && value.since !== undefined), {
    message: "--since applies to channels only.",
  })
  .refine((value) => !(value.url !== undefined && value.region !== undefined), {
    message: "--region applies to keyword searches only.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Register a TikTok channel or keyword search and start a collect run.")
    .option("--url <url>", "TikTok channel URL (https://www.tiktok.com/@name)")
    .option("--keyword <text>", "Keyword to search")
    .option("--region <code>", "Search region, ISO country code (default VN)")
    .option("--since <iso>", "Collect videos published on or after this datetime (channels)")
    .option("--max-records <n>", "Hard cap on collected videos")
    .option("--dry-run", "Show what would run without writing", false)
    .option("--yes", "Register the source and start the run (TikHub bills per request)", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();

  console.log(`[${SCRIPT}] Target`, {
    ...(options.url !== undefined
      ? { channel: parseTiktokSourceUrl(options.url) }
      : { keyword: options.keyword, region: options.region ?? "default" }),
    since: options.since ?? (options.url ? "incremental" : "n/a"),
    maxRecords: options.maxRecords ?? "default",
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to start the collection.`);
    return;
  }

  const registered =
    options.url !== undefined
      ? await registerTiktokSource({ url: options.url })
      : await registerTiktokSearchSource({
          keyword: options.keyword!,
          region: options.region,
        });
  console.log(`[${SCRIPT}] Source`, registered);

  const run = await collectSource({
    sourceId: registered.sourceId,
    since: options.since,
    maxRecords: options.maxRecords,
  });
  console.log(`[${SCRIPT}] Collect run started`, run);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
