// Seed default rows in system_schedules.
//
// Example:
//   npx tsx scripts/seed-system-schedules.ts --dry-run
//   npx tsx scripts/seed-system-schedules.ts --yes
//   npm run db:seed-system-schedules -- --yes

import "dotenv/config";
import { Command } from "commander";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { systemSchedules } from "@/db/schema";
import { DEFAULT_SYSTEM_SCHEDULES } from "@/lib/system-schedules/constants";
import { db } from "@/lib/db";

const SCRIPT = "seed-system-schedules";

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
    .description("Seed default system_schedules rows.")
    .option("--dry-run", "Preview rows without writing", false)
    .option("--yes", "Apply the seed", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const apply = options.yes;

  console.log(`[${SCRIPT}] Starting`, {
    mode: apply ? "apply" : "dry-run",
    rowCount: DEFAULT_SYSTEM_SCHEDULES.length,
  });

  for (const schedule of DEFAULT_SYSTEM_SCHEDULES) {
    console.log(`[${SCRIPT}] ${schedule.scheduleId}`);
    console.log(`  jobName : ${schedule.jobName}`);
    console.log(`  cron    : ${schedule.cronConfig.cron}`);
    console.log(`  tz      : ${schedule.cronConfig.timezone}`);

    if (!apply) {
      console.log("  → dry-run, skipping.");
      continue;
    }

    await db
      .insert(systemSchedules)
      .values({
        scheduleId: schedule.scheduleId,
        jobName: schedule.jobName,
        cronConfig: schedule.cronConfig,
        description: schedule.description,
        enabled: true,
      })
      .onConflictDoUpdate({
        target: systemSchedules.scheduleId,
        set: {
          jobName: schedule.jobName,
          cronConfig: schedule.cronConfig,
          description: schedule.description,
          updatedAt: new Date(),
        },
      });
  }

  if (apply) {
    const countResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count FROM system_schedules
    `);
    const count = countResult.rows[0]?.count ?? "0";

    console.log(`[${SCRIPT}] Done. system_schedules row count: ${count}.`);
    return;
  }

  console.log(`[${SCRIPT}] Dry-run complete — pass --yes to apply.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
