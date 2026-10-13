// Handle due comment-refresh checkpoints by hand, before the scheduler exists.
// Posts just added by a post run are decided from their stored comment count;
// the rest are re-read by facebook-post-refresh runs (1 Bright Data record per
// post), which then start facebook-comments runs for posts that pass the rules
// in lib/connectors/config.ts. Without --yes nothing is written or triggered.
//
// Example:
//   npx tsx scripts/check-item-refreshes.ts
//   npx tsx scripts/check-item-refreshes.ts --source-id <uuid> --limit 50 --yes
//   npm run refresh:check -- --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { dispatchDueRefreshes } from "@/lib/connectors/services/dispatch-due-refreshes";

const SCRIPT = "check-item-refreshes";

const optionsSchema = z.object({
  sourceId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(5000),
  yes: z.boolean(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Dispatch due comment-refresh checkpoints.")
    .option("--source-id <uuid>", "Only checkpoints of this source")
    .option("--limit <n>", "Max due checkpoints to handle", "500")
    .option("--yes", "Write schedules and start the Bright Data runs", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  console.log(`[${SCRIPT}] Options`, {
    ...options,
    mode: options.yes ? "apply" : "dry-run",
  });

  const result = await dispatchDueRefreshes({
    sourceId: options.sourceId,
    limit: options.limit,
    dryRun: !options.yes,
  });

  console.log(`[${SCRIPT}] Due checkpoints`, { due: result.due });
  if (result.decidedDirectly.length > 0) {
    console.table(
      result.decidedDirectly.map((decision) => ({
        contentItemId: decision.contentItemId,
        checkpoint: `+${decision.checkpointHours}h`,
        numComments: decision.numComments,
        collected: decision.collectedCount ?? "-",
        collect: decision.collect ?? "skip",
        next: decision.nextCheckpointHours ? `+${decision.nextCheckpointHours}h` : "done",
      })),
    );
  }
  console.log(`[${SCRIPT}] Refresh runs`, result.refreshRuns);
  console.log(`[${SCRIPT}] Comment runs`, result.commentRuns);

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to apply.`);
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
