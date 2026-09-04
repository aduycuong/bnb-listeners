// Manually trigger a topic digest recompute run without waiting for the
// QStash cron schedule. Runs in-process — useful for local debugging or
// ops one-offs.
//
// Examples:
//   npx tsx scripts/trigger-digest-recompute.ts --dry-run
//   npx tsx scripts/trigger-digest-recompute.ts --yes
//   npx tsx scripts/trigger-digest-recompute.ts --bulk --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { bulkDrainTopicDigests } from "@/lib/topic-digests/services/bulk-drain-topic-digests";
import { recomputeTopicDigests } from "@/lib/topic-digests/services/recompute-topic-digests";
import {
  BULK_DRAIN_BATCH_SIZE,
  BULK_DRAIN_JOB_NAME,
  RECOMPUTE_BATCH_SIZE,
  RECOMPUTE_JOB_NAME,
} from "@/lib/topic-digests/constants";

const SCRIPT = "trigger-digest-recompute";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const optionsSchema = z
  .object({
    bulk: z.boolean(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((v) => !(v.dryRun && v.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Manually trigger a topic digest recompute run in-process.")
    .option(
      "--bulk",
      "Run the bulk-drain job (is_bulk_stale rows) instead of the normal recompute job.",
      false,
    )
    .option("--dry-run", "Show what would run without executing anything.", false)
    .option("--yes", "Execute the job.", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();
  const jobName = options.bulk ? BULK_DRAIN_JOB_NAME : RECOMPUTE_JOB_NAME;
  const batchSize = options.bulk ? BULK_DRAIN_BATCH_SIZE : RECOMPUTE_BATCH_SIZE;

  console.log(`[${SCRIPT}] Starting`, {
    job: jobName,
    batchSize,
    action: options.yes ? "execute" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry-run — pass --yes to execute.`);
    return;
  }

  if (options.bulk) {
    await bulkDrainTopicDigests();
  } else {
    await recomputeTopicDigests();
  }

  console.log(`[${SCRIPT}] Done.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
