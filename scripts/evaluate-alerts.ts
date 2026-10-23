// Evaluate alert rules and send email. Dry-run unless --yes is passed.
//
// Example:
//   npm run alerts:evaluate -- -- --dry-run
//   npm run alerts:evaluate -- -- --yes
//   npm run alerts:evaluate -- -- --project-id <uuid> --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { evaluateAlerts } from "@/lib/alerts/services/evaluate-alerts";

const SCRIPT = "evaluate-alerts";

const optionsSchema = z
  .object({
    projectId: z.uuid().optional(),
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
    .description("Evaluate enabled alert rules and send email for new firings.")
    .option("--project-id <uuid>", "Only this project")
    .option("--dry-run", "List firings without writing or sending", false)
    .option("--yes", "Write alerts and send email", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const apply = options.yes;

  console.log(`[${SCRIPT}] Starting`, {
    mode: apply ? "apply" : "dry-run",
    projectId: options.projectId ?? "all",
  });

  const result = await evaluateAlerts({
    dryRun: !apply,
    projectId: options.projectId,
  });

  console.log(`[${SCRIPT}] Scanned ${result.projects} project(s).`);
  if (result.hits.length === 0) {
    console.log(`[${SCRIPT}] No new alerts.`);
  }
  for (const hit of result.hits) {
    console.log(`[${SCRIPT}] ${hit.outcome} ${hit.projectName}: ${hit.title}`);
    if (hit.outcome === "dry_run") console.log(`  ${hit.body}`);
    if (hit.emailError) console.log(`  ${hit.emailError}`);
  }
  console.log(
    `[${SCRIPT}] Done. created ${result.created}, emailed ${result.emailed}, email failed ${result.emailFailed}.`,
  );
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
