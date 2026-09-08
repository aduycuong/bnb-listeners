// Register (or update) system-level QStash schedules from system_schedules rows.
// Run this once per deploy or whenever the cron expression or callback URL changes.
//
// Example:
//   npx tsx scripts/sync-system-schedules.ts --dry-run
//   npx tsx scripts/sync-system-schedules.ts --yes
//   npx tsx scripts/sync-system-schedules.ts --callback-url https://my-preview.vercel.app/api/qstash/callback --yes
//   npx tsx scripts/sync-system-schedules.ts --callback-url https://bnb-listeners.bienhinh.vn/api/qstash/callback --yes

import "dotenv/config";
import { asc } from "drizzle-orm";
import { Command } from "commander";
import { z } from "zod";

import { systemSchedules } from "@/db/schema";
import { db } from "@/lib/db";
import { deleteSchedule } from "@/lib/qstash/services/delete-schedule-service";
import { getSchedule } from "@/lib/qstash/services/get-schedule-service";
import { buildQstashCron } from "@/lib/qstash/utils/build-qstash-cron";
import { getCallbackUrl } from "@/lib/qstash/utils/get-callback-url";
import { getQstashClient } from "@/lib/qstash/utils/get-qstash-client";

const SCRIPT = "sync-system-schedules";

const optionsSchema = z
  .object({
    callbackUrl: z.string().url().optional(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

type DbSystemSchedule = typeof systemSchedules.$inferSelect;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description(
      "Register or update system-level QStash schedules from system_schedules.",
    )
    .option(
      "--callback-url <url>",
      "Override the QStash callback URL (e.g. for a preview deployment). " +
        "Defaults to QSTASH_CALLBACK_URL or NEXT_PUBLIC_APP_URL from the environment.",
    )
    .option(
      "--dry-run",
      "Preview which schedules would be created/updated without writing",
      false,
    )
    .option("--yes", "Apply changes to QStash", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function syncScheduleRow(
  schedule: DbSystemSchedule,
  callbackUrl: string,
  dryRun: boolean,
): Promise<void> {
  const qstashCron = buildQstashCron(schedule.cronConfig);
  const shouldSchedule = schedule.enabled && qstashCron !== null;
  const existing = dryRun ? null : await getSchedule({ scheduleId: schedule.scheduleId });

  console.log(`[${SCRIPT}] Schedule: ${schedule.scheduleId}`);
  console.log(`  jobName    : ${schedule.jobName}`);
  console.log(`  enabled    : ${schedule.enabled}`);
  console.log(`  cron       : ${schedule.cronConfig.cron}`);
  console.log(`  timezone   : ${schedule.cronConfig.timezone}`);
  console.log(`  callbackUrl: ${callbackUrl}`);
  console.log(`  description: ${schedule.description ?? ""}`);

  if (!shouldSchedule) {
    console.log("  action     : delete (disabled or empty cron)");
    if (dryRun) {
      console.log("  → dry-run, skipping.");
      return;
    }

    if (existing) {
      await deleteSchedule({ scheduleId: schedule.scheduleId });
    }

    console.log("  ✓ removed or already absent.");
    return;
  }

  if (
    existing &&
    existing.cron === qstashCron &&
    existing.destination === callbackUrl
  ) {
    console.log("  action     : no-op (already synced)");
    return;
  }

  console.log(`  action     : upsert (${qstashCron})`);

  if (dryRun) {
    console.log("  → dry-run, skipping.");
    return;
  }

  if (existing) {
    await deleteSchedule({ scheduleId: schedule.scheduleId });
  }

  const client = getQstashClient();
  await client.schedules.create({
    scheduleId: schedule.scheduleId,
    destination: callbackUrl,
    cron: qstashCron,
    body: JSON.stringify({
      jobName: schedule.jobName,
      payload: {},
    }),
  });

  console.log("  ✓ synced.");
}

async function main() {
  const options = parseArgs();
  const callbackUrl = options.callbackUrl ?? getCallbackUrl();
  const dryRun = !options.yes;

  const rows = await db
    .select()
    .from(systemSchedules)
    .orderBy(asc(systemSchedules.scheduleId));

  if (rows.length === 0) {
    console.error(
      `[${SCRIPT}] No system_schedules rows found. Run: npm run db:seed-system-schedules -- --yes`,
    );
    process.exit(1);
  }

  console.log(`[${SCRIPT}] Starting`, {
    mode: dryRun ? "dry-run" : "apply",
    callbackUrl,
    scheduleCount: rows.length,
  });

  for (const schedule of rows) {
    await syncScheduleRow(schedule, callbackUrl, dryRun);
  }

  console.log(`[${SCRIPT}] Done.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
