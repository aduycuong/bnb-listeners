// Register (or update) system-level QStash schedules that are not tied to
// any user-created job record. Run this once per deploy or whenever the
// cron expression or callback URL changes.
//
// Example:
//   npx tsx scripts/sync-system-schedules.ts --dry-run
//   npx tsx scripts/sync-system-schedules.ts --yes
//   npx tsx scripts/sync-system-schedules.ts --callback-url https://my-preview.vercel.app/api/qstash/callback --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { getCallbackUrl } from "@/lib/qstash/utils/get-callback-url";
import { getQstashClient } from "@/lib/qstash/utils/get-qstash-client";
import {
  BULK_DRAIN_JOB_NAME,
  RECOMPUTE_JOB_NAME,
} from "@/lib/topic-digests/constants";

const SCRIPT = "sync-system-schedules";

// ---------------------------------------------------------------------------
// Schedule definitions
// ---------------------------------------------------------------------------

type SystemSchedule = {
  /** Stable ID used by QStash to upsert instead of creating duplicates. */
  scheduleId: string;
  jobName: string;
  cron: string;
  description: string;
};

const SYSTEM_SCHEDULES: SystemSchedule[] = [
  {
    scheduleId: "system:recompute-topic-digests",
    jobName: RECOMPUTE_JOB_NAME,
    cron: "*/15 * * * *",
    description:
      "Recompute daily digest metrics for normal-stale topic rows every 15 min.",
  },
  {
    scheduleId: "system:bulk-drain-topic-digests",
    jobName: BULK_DRAIN_JOB_NAME,
    cron: "*/15 * * * *",
    description:
      "Drain bulk-stale topic digest rows (taxonomy restructures) every 15 min.",
  },
];

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const optionsSchema = z
  .object({
    callbackUrl: z.string().url().optional(),
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
    .description(
      "Register or update system-level QStash schedules (topic digest jobs).",
    )
    .option(
      "--callback-url <url>",
      "Override the QStash callback URL (e.g. for a preview deployment). " +
        "Defaults to QSTASH_CALLBACK_URL or NEXT_PUBLIC_APP_URL from the environment.",
    )
    .option("--dry-run", "Preview which schedules would be created/updated without writing", false)
    .option("--yes", "Apply changes to QStash", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function syncSchedule(
  schedule: SystemSchedule,
  callbackUrl: string,
  dryRun: boolean,
): Promise<void> {
  const client = getQstashClient();

  console.log(`[${SCRIPT}] Schedule: ${schedule.scheduleId}`);
  console.log(`  cron       : ${schedule.cron}`);
  console.log(`  jobName    : ${schedule.jobName}`);
  console.log(`  callbackUrl: ${callbackUrl}`);
  console.log(`  description: ${schedule.description}`);

  if (dryRun) {
    console.log(`  → dry-run, skipping.`);
    return;
  }

  // QStash upserts when scheduleId is provided — safe to re-run.
  await client.schedules.create({
    scheduleId: schedule.scheduleId,
    destination: callbackUrl,
    cron: schedule.cron,
    body: JSON.stringify({
      jobName: schedule.jobName,
      payload: {},
    }),
  });

  console.log(`  ✓ synced.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";
  const callbackUrl = options.callbackUrl ?? getCallbackUrl();

  console.log(`[${SCRIPT}] Starting`, {
    mode,
    callbackUrl,
    scheduleCount: SYSTEM_SCHEDULES.length,
  });

  for (const schedule of SYSTEM_SCHEDULES) {
    await syncSchedule(schedule, callbackUrl, !options.yes);
  }

  console.log(`[${SCRIPT}] Done.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
