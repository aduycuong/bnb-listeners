// Seed the five demo listening projects into every workspace.
// Skips a project when that workspace already has the same name.
//
// Example:
//   npx tsx scripts/seed-demo-projects.ts --dry-run
//   npx tsx scripts/seed-demo-projects.ts --yes
//   npm run db:seed-demo-projects -- --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { workspaces } from "@/db/schema";
import { db } from "@/lib/db";
import { DEMO_PROJECTS } from "@/lib/projects/demo-projects";
import { seedDemoProjects } from "@/lib/projects/services/seed-demo-projects";

const SCRIPT = "seed-demo-projects";

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
    .description(
      "Seed the five demo listening projects into every workspace.",
    )
    .option("--dry-run", "Preview projects without writing", false)
    .option("--yes", "Insert missing demo projects", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const apply = options.yes;
  const rows = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces);

  console.log(`[${SCRIPT}] Starting`, {
    mode: apply ? "apply" : "dry-run",
    workspaces: rows.length,
    projects: DEMO_PROJECTS.map((project) => project.name),
  });

  if (rows.length === 0) {
    console.log(`[${SCRIPT}] No workspaces found.`);
    return;
  }

  for (const workspace of rows) {
    console.log(`[${SCRIPT}] ${workspace.name} (${workspace.id})`);

    if (!apply) {
      console.log("  → dry-run, skipping.");
      continue;
    }

    const result = await seedDemoProjects({ workspaceId: workspace.id });
    console.log(`  created: ${result.created.length ? result.created.join(", ") : "none"}`);
    console.log(`  skipped: ${result.skipped.length ? result.skipped.join(", ") : "none"}`);
  }

  if (apply) {
    console.log(`[${SCRIPT}] Done.`);
    return;
  }

  console.log(`[${SCRIPT}] Dry-run complete — pass --yes to apply.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
