// Fill a gap of a Facebook source or a TikTok channel: collect the posts
// published between --from and --to, which the incremental runs never revisit
// (a source added late, or a long pause). --to defaults to the oldest stored
// post plus the overlap in lib/connectors/config.ts, so "go back to day X" is
// just --from. Posts already stored are skipped. A TikTok range is split into
// short runs (--window-days) because a run has a time budget. Dry run by
// default; --yes starts the runs (Bright Data and TikHub bill for them).
//
// Example:
//   npm run backfill -- -- --source <source-id|url> --from 2026-10-01
//   npm run backfill -- -- --source <source-id|url> --from 2026-10-01 --to 2026-10-10 --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { backfillSource } from "@/lib/connectors/services/backfill-source";
import { planBackfillSource } from "@/lib/connectors/services/plan-backfill-source";
import { commandArgv } from "./script-argv";

const SCRIPT = "backfill-source";

/** A date (UTC midnight) or a full ISO datetime, as an ISO datetime. */
const instantSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Expected a date (2026-10-01) or an ISO datetime.",
  })
  .transform((value) => new Date(value).toISOString());

const optionsSchema = z
  .object({
    source: z.string().trim().min(1),
    from: instantSchema,
    to: instantSchema.optional(),
    maxRecords: z.coerce.number().int().min(1).max(5000).optional(),
    windowDays: z.coerce.number().int().min(1).max(30).optional(),
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
    .description("Collect the posts of a source published inside a past range.")
    .requiredOption("--source <id|url>", "Source id or its exact URL")
    .requiredOption("--from <date>", "Start of the gap (2026-10-01 or ISO datetime)")
    .option("--to <date>", "End of the gap (default: oldest stored post + overlap)")
    .option("--max-records <n>", "Hard cap on collected posts per run")
    .option("--window-days <n>", "Days per run for TikTok channels")
    .option("--dry-run", "Show the plan without starting runs (default)", false)
    .option("--yes", "Start the runs (the provider bills for them)", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const request = {
    source: options.source,
    from: options.from,
    to: options.to,
    maxRecords: options.maxRecords,
    windowDays: options.windowDays,
  };

  const plan = await planBackfillSource(request);
  console.log(`[${SCRIPT}] Plan`, {
    source: plan.sourceId,
    connector: plan.connector,
    from: plan.from.toISOString(),
    to: plan.to.toISOString(),
    toFromStoredPosts: plan.toFromStoredPosts,
    existingPostsInRange: plan.existingPosts,
    runs: plan.windows.length,
    windows: plan.windows.map(
      (window) => `${window.since.toISOString()} -> ${window.until.toISOString()}`,
    ),
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to start the runs.`);
    return;
  }

  const result = await backfillSource(request);
  console.log(`[${SCRIPT}] Runs started`, result.runs);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
