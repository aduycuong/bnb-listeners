// Rewrite the L4 daily metrics (project_metrics_daily, project_aspect_daily) from L3
// (docs/decisions.md D28). Without --days every day of the project is rewritten, which is
// the backfill after the tables are created or a project is rematched.
//
// Example:
//   npm run metrics:refresh -- -- --all
//   npm run metrics:refresh -- -- --project-id <uuid>
//   npm run metrics:refresh -- -- --all --days 35

import "dotenv/config";
import { Command } from "commander";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { projects } from "@/db/schema";
import { db } from "@/lib/db";
import { refreshProjectMetricsDaily } from "@/lib/metrics/services/refresh-project-metrics-daily";
import { listeningProjectFilter } from "@/lib/projects/utils/listening-project-filter";

import { commandArgv } from "./script-argv";

const SCRIPT = "refresh-metrics-daily";
const DAY_MS = 24 * 60 * 60 * 1000;

const optionsSchema = z
  .object({
    projectId: z.uuid().optional(),
    all: z.boolean(),
    days: z.coerce.number().int().positive().optional(),
  })
  .refine((value) => Boolean(value.projectId) !== value.all, {
    message: "Choose one: --project-id <uuid> or --all.",
  });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Rewrite the L4 daily metrics of projects from L3.")
    .option("--project-id <uuid>", "Only this project")
    .option("--all", "Every project", false)
    .option("--days <n>", "Only the last n days (default: every day)");

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const rows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(options.projectId ? eq(projects.id, options.projectId) : listeningProjectFilter)
    .orderBy(asc(projects.createdAt));
  const from = options.days ? new Date(Date.now() - (options.days - 1) * DAY_MS) : undefined;

  console.log(`[${SCRIPT}] Starting`, { projects: rows.length, days: options.days ?? "all" });
  for (const project of rows) {
    const startedAt = Date.now();
    const result = await refreshProjectMetricsDaily({ projectId: project.id, from });
    console.log(
      `[${SCRIPT}] ${project.name}: ${result.metricRows} metric rows, ${result.aspectRows} aspect rows (${Date.now() - startedAt} ms)`,
    );
  }
  console.log(`[${SCRIPT}] Done.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
