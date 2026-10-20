// Write the archived payload of a collect run into the raw store again, e.g.
// after fixing a parser, without paying Bright Data for a new job. Runs the
// workflow's steps in-process: normalize, the connector's after-normalize hook
// (schedules, tier, comment decisions), finish, then follow-up runs.
//
// Re-running a post run that already stored its posts plans their comment
// runs again; pass --skip-follow-ups to only rewrite the items.
//
// Example:
//   npx tsx scripts/renormalize-collect-run.ts --run-id <uuid>
//   npm run collect:renormalize -- -- --run-id <uuid> --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { renormalizeCollectRun } from "@/lib/connectors/services/renormalize-collect-run";

const SCRIPT = "renormalize-collect-run";

const optionsSchema = z.object({
  runId: z.uuid(),
  skipFollowUps: z.boolean(),
  yes: z.boolean(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Normalize an archived collect-run payload again.")
    .requiredOption("--run-id <uuid>", "collect_runs.id")
    .option("--skip-follow-ups", "Do not start follow-up runs", false)
    .option("--yes", "Write to the raw store and start follow-ups", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  console.log(`[${SCRIPT}] Options`, {
    ...options,
    mode: options.yes ? "apply" : "dry-run",
  });

  const result = await renormalizeCollectRun({
    collectRunId: options.runId,
    dryRun: !options.yes,
    skipFollowUps: options.skipFollowUps,
  });

  console.log(`[${SCRIPT}] Run`, {
    connector: result.connector,
    payloadKey: result.payloadKey,
    records: result.records,
    previousStats: result.previousStats,
  });
  console.log(`[${SCRIPT}] Stats`, result.stats);
  console.log(
    `[${SCRIPT}] Follow-ups`,
    result.followUps.map((followUp) => ({
      connector: followUp.connector,
      sourceId: followUp.sourceId,
      collectRunId: followUp.collectRunId ?? (options.skipFollowUps ? "skipped" : null),
    })),
  );

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to apply.`);
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
