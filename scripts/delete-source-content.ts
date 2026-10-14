// Delete the posts, comments and replies of one source from the raw store.
// The source, its authors and its collect runs are kept. This cannot be undone;
// collected (non-synthetic) data costs money to collect again, so the preview
// shows counts by kind and origin first, and --origin limits the delete.
//
// Example:
//   npm run source:delete-content -- --source <uuid>
//   npm run source:delete-content -- --source <uuid> --origin synthetic --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { deleteSourceContentItems } from "@/lib/raw-store/services/delete-source-content-items";
import { RAW_ORIGINS } from "@/lib/raw-store/types";

const SCRIPT = "delete-source-content";

const optionsSchema = z.object({
  source: z.uuid(),
  origin: z.enum(RAW_ORIGINS).optional(),
  yes: z.boolean(),
});

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Delete the content items of one source.")
    .requiredOption("--source <id>", "Source id (uuid)")
    .option(
      "--origin <origin>",
      `Only items of this origin (${RAW_ORIGINS.join(" | ")}); default all`,
    )
    .option("--yes", "Delete (default is a preview of the counts)", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();

  const result = await deleteSourceContentItems({
    sourceId: options.source,
    origin: options.origin,
    dryRun: !options.yes,
  });

  console.log(`[${SCRIPT}] Source`, {
    id: options.source,
    name: result.sourceName,
    origin: options.origin ?? "all",
  });
  console.table(result.groups);
  console.log(`[${SCRIPT}] ${options.yes ? "Deleted" : "Would delete"}`, {
    total: result.total,
    deleted: result.deleted,
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Preview only — pass --yes to delete.`);
  }
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
