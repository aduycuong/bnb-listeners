// Register a Facebook group/page as a raw-store source and start an incremental
// collection (collect-source workflow). Without --since, the run asks for posts
// since the newest stored post minus the overlap in lib/connectors/config.ts, or
// the initial lookback for a new source. Comments are not collected here; new
// posts get comment-refresh schedules (npm run refresh:check).
//
// Example:
//   npx tsx scripts/collect-facebook-source.ts --url https://www.facebook.com/groups/reviewbatdongsanaz --dry-run
//   npx tsx scripts/collect-facebook-source.ts --url https://www.facebook.com/groups/reviewbatdongsanaz --max-records 50 --yes
//   npm run collect:facebook -- -- --url https://www.facebook.com/somepage --since 2026-10-01T00:00:00Z --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { parseFacebookSourceUrl } from "@/lib/connectors/facebook/utils/parse-facebook-source-url";
import { collectSource } from "@/lib/connectors/services/collect-source";
import { registerFacebookSource } from "@/lib/connectors/services/register-facebook-source";

const SCRIPT = "collect-facebook-source";

const optionsSchema = z
  .object({
    url: z.string().refine((value) => parseFacebookSourceUrl(value) !== null, {
      message: "--url must be a Facebook group or page URL.",
    }),
    since: z.iso.datetime({ offset: true }).optional(),
    maxRecords: z.coerce.number().int().min(1).max(5000).optional(),
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
    .description("Register a Facebook source and start a collect run.")
    .requiredOption("--url <url>", "Facebook group or page URL")
    .option("--since <iso>", "Collect posts published on or after this datetime")
    .option("--max-records <n>", "Hard cap on delivered records (default 500)")
    .option("--dry-run", "Show what would run without writing", false)
    .option("--yes", "Register the source and start the run", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const ref = parseFacebookSourceUrl(options.url)!;

  console.log(`[${SCRIPT}] Target`, {
    ...ref,
    since: options.since ?? "incremental",
    maxRecords: options.maxRecords ?? "default",
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to start the collection.`);
    return;
  }

  const { sourceId, created } = await registerFacebookSource({ url: options.url });
  console.log(`[${SCRIPT}] Source`, { sourceId, created });

  const run = await collectSource({
    sourceId,
    since: options.since,
    maxRecords: options.maxRecords,
  });
  console.log(`[${SCRIPT}] Collect run started`, run);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
