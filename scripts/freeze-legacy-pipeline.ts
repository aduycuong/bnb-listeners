// Freeze the legacy collect/score/classify pipeline during the social listening rebuild.
// Disables every enabled data source and system schedule, deletes their QStash
// schedules, and records what was disabled so it can be re-enabled later.
// Already-queued comment follow-ups become no-ops once their data source is disabled.
//
// Example:
//   npx tsx scripts/freeze-legacy-pipeline.ts --dry-run
//   npx tsx scripts/freeze-legacy-pipeline.ts --yes
//   npm run legacy:freeze -- --yes

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { Command } from "commander";
import { z } from "zod";

import { dataSources, systemSchedules } from "@/db/schema";
import { db } from "@/lib/db";
import { getDataSourceScheduleId } from "@/lib/data-sources/utils/get-data-source-schedule-id";
import { deleteSchedule } from "@/lib/qstash/services/delete-schedule-service";

const SCRIPT = "freeze-legacy-pipeline";

const optionsSchema = z
  .object({
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
    .description("Disable legacy data sources and system schedules.")
    .option("--dry-run", "Preview what would be disabled without writing", false)
    .option("--yes", "Disable and delete QStash schedules", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const apply = options.yes;

  const sources = await db
    .select({
      id: dataSources.id,
      workspaceId: dataSources.workspaceId,
      name: dataSources.name,
      sourceType: dataSources.sourceType,
      cronConfig: dataSources.cronConfig,
    })
    .from(dataSources)
    .where(eq(dataSources.enabled, true));

  const schedules = await db
    .select({
      id: systemSchedules.id,
      scheduleId: systemSchedules.scheduleId,
      jobName: systemSchedules.jobName,
    })
    .from(systemSchedules)
    .where(eq(systemSchedules.enabled, true));

  console.log(`[${SCRIPT}] Starting`, {
    mode: apply ? "apply" : "dry-run",
    dataSources: sources.length,
    systemSchedules: schedules.length,
  });

  for (const source of sources) {
    console.log(`  data source: ${source.name} [${source.sourceType}] cron="${source.cronConfig.cron}"`);
  }
  for (const schedule of schedules) {
    console.log(`  system schedule: ${schedule.scheduleId} (${schedule.jobName})`);
  }

  if (!apply) {
    console.log(`[${SCRIPT}] Dry-run complete — pass --yes to apply.`);
    return;
  }

  // Record before writing so a partial failure still leaves a restore list.
  const outDir = path.resolve(".local", "exports");
  const recordPath = path.join(outDir, `frozen-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    recordPath,
    `${JSON.stringify({ frozenAt: new Date().toISOString(), dataSources: sources, systemSchedules: schedules }, null, 2)}\n`,
  );
  console.log(`[${SCRIPT}] Restore list written`, { recordPath });

  if (sources.length > 0) {
    await db
      .update(dataSources)
      .set({ enabled: false })
      .where(inArray(dataSources.id, sources.map((source) => source.id)));
  }
  if (schedules.length > 0) {
    await db
      .update(systemSchedules)
      .set({ enabled: false })
      .where(inArray(systemSchedules.id, schedules.map((schedule) => schedule.id)));
  }

  for (const source of sources) {
    await deleteSchedule({ scheduleId: getDataSourceScheduleId(source.id) });
  }
  for (const schedule of schedules) {
    await deleteSchedule({ scheduleId: schedule.scheduleId });
  }

  console.log(`[${SCRIPT}] Done.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
