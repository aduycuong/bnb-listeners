// Delete every project of every workspace (D30): projects made before one project tracked one
// subject are not migrated. Mentions, Enrich output, L4, alerts and reports go with them
// (cascade); the raw store, sources and their schedules are kept. This cannot be undone, so
// the default is a preview of what would go.
//
// Example:
//   npm run projects:delete-all -- --
//   npm run projects:delete-all -- -- --yes

import "dotenv/config";
import { Command } from "commander";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";

import { commandArgv } from "./script-argv";

const SCRIPT = "delete-all-projects";

const optionsSchema = z.object({ yes: z.boolean() });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Delete every project; the raw store and sources are kept.")
    .option("--yes", "Delete (default is a preview)", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();

  const { rows } = await db.execute<{
    id: string;
    workspace: string;
    name: string;
    case: string;
    mentions: number;
  }>(sql`
    select p.id, w.name as workspace, p.name, p.case,
      (select count(*)::int from mentions m where m.project_id = p.id) as mentions
    from projects p
    join workspaces w on w.id = p.workspace_id
    order by w.name, p.name
  `);
  console.table(rows);

  if (!options.yes) {
    console.log(`[${SCRIPT}] Would delete ${rows.length} projects. Pass --yes to delete.`);
    return;
  }

  const { rows: deleted } = await db.execute<{ id: string }>(sql`delete from projects returning id`);
  console.log(`[${SCRIPT}] Deleted ${deleted.length} projects.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
