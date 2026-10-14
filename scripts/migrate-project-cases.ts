// Move projects from the generic listening cases to the real estate case ids
// (docs/decisions.md D10) and flag the seeded demo projects with `is_demo`.
// Run after the D10 schema migration.
//
// Example:
//   npx tsx scripts/migrate-project-cases.ts --dry-run
//   npm run projects:migrate-cases -- --yes

import "dotenv/config";
import { Command } from "commander";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { projects } from "@/db/schema";
import { db } from "@/lib/db";
import { DEMO_PROJECTS } from "@/lib/projects/demo-projects";
import {
  LEGACY_PROJECT_CASES,
  PROJECT_CASES,
  parseProjectCase,
} from "@/lib/projects/project-cases";

const SCRIPT = "migrate-project-cases";

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
    .description("Map legacy project cases to real estate case ids and flag demo projects.")
    .option("--dry-run", "Preview changes without writing", false)
    .option("--yes", "Apply changes", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const apply = options.yes;
  const demoNames = new Set(DEMO_PROJECTS.map((project) => project.name));
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      listeningCase: projects.listeningCase,
      isDemo: projects.isDemo,
    })
    .from(projects);

  const changes = rows
    .map((row) => {
      const nextCase = parseProjectCase(row.listeningCase);
      const nextIsDemo = row.isDemo || demoNames.has(row.name);
      return { ...row, nextCase, nextIsDemo };
    })
    .filter((row) => row.nextCase !== row.listeningCase || row.nextIsDemo !== row.isDemo);

  console.log(`[${SCRIPT}] Starting`, {
    mode: apply ? "apply" : "dry-run",
    projects: rows.length,
    changes: changes.length,
  });

  for (const row of changes) {
    const unknown =
      !(PROJECT_CASES as readonly string[]).includes(row.listeningCase) &&
      !(row.listeningCase in LEGACY_PROJECT_CASES);
    console.log(
      `[${SCRIPT}] ${row.name}: ${row.listeningCase} → ${row.nextCase}${
        row.nextIsDemo !== row.isDemo ? " · is_demo" : ""
      }${unknown ? " (unknown case, defaulted)" : ""}`,
    );
  }

  if (!apply) {
    console.log(`[${SCRIPT}] Dry run. Pass --yes to apply.`);
    return;
  }

  for (const row of changes) {
    await db
      .update(projects)
      .set({ listeningCase: row.nextCase, isDemo: row.nextIsDemo })
      .where(eq(projects.id, row.id));
  }

  console.log(`[${SCRIPT}] Updated ${changes.length} project(s).`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, error);
  process.exit(1);
});
