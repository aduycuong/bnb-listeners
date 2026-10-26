// Generate the AI report of a project for one period (docs/decisions.md D29) and print it.
// Calls the model and overwrites the stored report of that period.
//
// Example:
//   npm run reports:generate -- -- --project-id <uuid> --type week --date 2026-10-20
//   npm run reports:generate -- -- --project-id <uuid> --type month
//   npm run reports:generate -- -- --project-id <uuid> --type rolling --days 14

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { reportPeriodSchema } from "@/lib/metrics/schema";
import { generateReport } from "@/lib/reports/services/generate-report";

import { commandArgv } from "./script-argv";

const SCRIPT = "generate-report";

const optionsSchema = z.object({
  projectId: z.uuid(),
  type: z.string(),
  date: z.string().optional(),
  days: z.coerce.number().int().positive().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Generate the AI report of a project for one period.")
    .requiredOption("--project-id <uuid>", "Project")
    .requiredOption("--type <type>", "day, week, month, quarter, year, rolling or custom")
    .option("--date <YYYY-MM-DD>", "A day of the calendar period (default: today)")
    .option("--days <n>", "Days of a rolling period")
    .option("--from <YYYY-MM-DD>", "First day of a custom period")
    .option("--to <YYYY-MM-DD>", "Last day of a custom period");

  program.parse(commandArgv());
  const options = optionsSchema.parse(program.opts());
  const period = reportPeriodSchema.parse(
    options.type === "rolling"
      ? { type: "rolling", days: options.days }
      : options.type === "custom"
        ? { type: "custom", from: options.from, to: options.to }
        : { type: options.type, date: options.date },
  );
  return { projectId: options.projectId, period };
}

async function main() {
  const { projectId, period } = parseArgs();
  console.log(`[${SCRIPT}] Starting`, { projectId, period });
  const startedAt = Date.now();
  const report = await generateReport({ projectId, period, trigger: "script" });

  const { sections } = report;
  console.log(`\n# ${report.metrics.projectName} · ${report.periodStart} – ${report.periodEnd}\n`);
  console.log(sections.summary);
  for (const [title, items] of [
    ["Điểm nổi bật", sections.highlights],
    ["Rủi ro", sections.risks],
  ] as const) {
    console.log(`\n## ${title}`);
    for (const item of items) console.log(`- ${item.title} ${item.body} (${item.mentionIds.length} trích dẫn)`);
  }
  console.log("\n## Khuyến nghị");
  for (const item of sections.recommendations) console.log(`- ${item.title} ${item.body}`);
  console.log(
    `\n[${SCRIPT}] Done in ${Date.now() - startedAt} ms. model ${report.model}, $${report.costUsd.toFixed(4)}, ${report.citations.length} citations.`,
  );
  if (report.warnings.length) console.log(`[${SCRIPT}] Warnings:`, report.warnings);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
