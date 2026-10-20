// Create, update or remove the QStash schedule that starts the
// schedule-collections workflow every COLLECT_CONFIG.scheduler.intervalMinutes.
// The schedule calls the workflow URL (UPSTASH_WORKFLOW_URL or
// NEXT_PUBLIC_APP_URL); with QSTASH_URL set it goes to the local QStash server.
//
// Without --yes it is a dry run that also previews the next tick: which
// sources are due for a post run and how many refresh checkpoints are due.
//
// Example:
//   npx tsx scripts/sync-collection-schedules.ts
//   npm run schedules:sync -- -- --yes
//   npm run schedules:sync -- -- --remove --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { COLLECT_CONFIG } from "@/lib/connectors/config";
import { dispatchDueRefreshes } from "@/lib/connectors/services/dispatch-due-refreshes";
import { dispatchDueSources } from "@/lib/connectors/services/dispatch-due-sources";
import { getSourceBudgets } from "@/lib/connectors/services/get-source-budgets";
import { syncWorkflowSchedule } from "@/lib/workflows/services/sync-workflow-schedule";

const SCRIPT = "sync-collection-schedules";
const SCHEDULE_ID = "schedule-collections";

const optionsSchema = z.object({
  remove: z.boolean(),
  yes: z.boolean(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Sync the QStash schedule of the schedule-collections workflow.")
    .option("--remove", "Delete the schedule (stops automatic collection)", false)
    .option("--yes", "Apply the change to QStash", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function previewNextTick() {
  const budgets = await getSourceBudgets();
  const sources = await dispatchDueSources({ budgets, dryRun: true });
  const refreshes = await dispatchDueRefreshes({
    excludeSourceIds: budgets.filter((b) => b.remaining <= 0).map((b) => b.sourceId),
    dryRun: true,
  });

  console.log(`[${SCRIPT}] Next tick preview`);
  console.table(
    sources.map((source) => ({
      sourceId: source.sourceId,
      tier: source.activityTier,
      lastRunAt: source.lastRunAt,
      status: source.status,
      maxRecords: source.maxRecords ?? "",
    })),
  );
  console.log(`[${SCRIPT}] Budgets`, budgets);
  console.log(`[${SCRIPT}] Refresh checkpoints`, {
    due: refreshes.due,
    runs: refreshes.refreshRuns,
  });
}

async function main() {
  const options = parseArgs();
  const cron = options.remove
    ? null
    : `*/${COLLECT_CONFIG.scheduler.intervalMinutes} * * * *`;

  const result = await syncWorkflowSchedule({
    scheduleId: SCHEDULE_ID,
    name: "schedule-collections",
    cron,
    dryRun: !options.yes,
  });
  console.log(`[${SCRIPT}] Schedule`, result);

  if (!options.yes) {
    await previewNextTick();
    console.log(`[${SCRIPT}] Dry run; pass --yes to apply.`);
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
