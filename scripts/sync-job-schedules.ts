// Create, update or remove the QStash schedules of the callback jobs listed in
// lib/qstash/system-schedules.ts (hourly alerts, scheduled AI reports). Schedules call
// QSTASH_CALLBACK_URL, or NEXT_PUBLIC_APP_URL + /api/qstash/callback: run it with the env of
// the server that should receive the jobs, after that server runs the code of every job.
// Other schedules in the QStash account are left alone.
//
// Without --yes it is a dry run.
//
// Example:
//   npm run schedules:jobs
//   npm run schedules:jobs -- -- --yes
//   npm run schedules:jobs -- -- --only system-generate-due-reports --yes
//   npm run schedules:jobs -- -- --only system-generate-due-reports --remove --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { qstashJobHandlers } from "@/lib/qstash/job-config";
import { syncJobSchedule } from "@/lib/qstash/services/sync-job-schedule";
import { SYSTEM_JOB_SCHEDULES } from "@/lib/qstash/system-schedules";

import { commandArgv } from "./script-argv";

const SCRIPT = "sync-job-schedules";

const optionsSchema = z
  .object({
    only: z.string().optional(),
    remove: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !value.remove || value.only, {
    message: "--remove needs --only <schedule id>.",
  });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Sync the QStash schedules of the callback jobs.")
    .option("--only <scheduleId>", "Only this schedule")
    .option("--remove", "Delete the schedule given with --only", false)
    .option("--yes", "Apply the changes to QStash", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const schedules = SYSTEM_JOB_SCHEDULES.filter(
    (schedule) => !options.only || schedule.scheduleId === options.only,
  );
  if (schedules.length === 0) {
    throw new Error(
      `Unknown schedule ${options.only}. Known: ${SYSTEM_JOB_SCHEDULES.map((s) => s.scheduleId).join(", ")}`,
    );
  }

  for (const schedule of schedules) {
    if (!(schedule.jobName in qstashJobHandlers)) {
      throw new Error(`No handler for job ${schedule.jobName} in lib/qstash/job-config.ts.`);
    }
    const result = await syncJobSchedule({
      scheduleId: schedule.scheduleId,
      jobName: schedule.jobName,
      cron: options.remove ? null : schedule.cron,
      dryRun: !options.yes,
    });
    console.log(`[${SCRIPT}] ${result.scheduleId}: ${result.action}${result.applied ? " (applied)" : ""}`);
    console.log(`  job ${result.jobName}, cron ${result.cron ?? "-"}`);
    console.log(`  destination ${result.destination}`);
    if (result.current && result.action !== "noop") {
      console.log(
        `  now in QStash: job ${result.current.jobName}, cron ${result.current.cron}, ${result.current.destination}`,
      );
    }
  }

  if (!options.yes) console.log(`[${SCRIPT}] Dry run; pass --yes to apply.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
