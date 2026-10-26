// List the scheduled AI reports that are due (docs/decisions.md D29), and queue or generate them.
// --dry-run lists them; --yes queues one QStash job each, as the hourly job does; --run
// generates them here one by one (calls the model).
//
// Example:
//   npm run reports:due -- -- --dry-run
//   npm run reports:due -- -- --yes
//   npm run reports:due -- -- --run

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { enqueueDueReports } from "@/lib/reports/services/enqueue-due-reports";
import { findDueReports } from "@/lib/reports/services/find-due-reports";
import { generateReport } from "@/lib/reports/services/generate-report";

import { commandArgv } from "./script-argv";

const SCRIPT = "generate-due-reports";

const optionsSchema = z
  .object({ dryRun: z.boolean(), yes: z.boolean(), run: z.boolean() })
  .refine((value) => [value.dryRun, value.yes, value.run].filter(Boolean).length === 1, {
    message: "Choose one: --dry-run, --yes or --run.",
  });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("List, queue or generate the scheduled AI reports that are due.")
    .option("--dry-run", "List the due reports", false)
    .option("--yes", "Queue one QStash job per due report", false)
    .option("--run", "Generate the due reports here, one by one", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const due = await findDueReports();
  console.log(`[${SCRIPT}] ${due.length} due report(s).`);
  for (const item of due) {
    console.log(`  ${item.projectName}: ${item.periodType} from ${item.periodStart}`);
  }

  if (options.yes) {
    const result = await enqueueDueReports();
    console.log(`[${SCRIPT}] Queued ${result.due} job(s).`);
  }
  if (options.run) {
    for (const item of due) {
      const report = await generateReport({
        projectId: item.projectId,
        period: { type: item.periodType, date: item.periodStart },
        trigger: "schedule",
      });
      console.log(
        `[${SCRIPT}] ${item.projectName} ${report.periodStart}–${report.periodEnd}: model ${report.model}, $${report.costUsd.toFixed(4)}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
