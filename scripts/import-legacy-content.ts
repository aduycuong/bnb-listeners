// Copy legacy Facebook `documents` (doc_type = post) and their `comments` into
// the raw store as `content_items` with origin = legacy_import. Sources and
// authors are created from the legacy metadata. Idempotent: re-running updates
// the same rows, and items a connector already collected are left untouched.
// Run `npm run legacy:export` first; the legacy tables are only read.
//
// Example:
//   npx tsx scripts/import-legacy-content.ts --dry-run
//   npx tsx scripts/import-legacy-content.ts --yes
//   npm run legacy:import -- -- --yes --batch-size 100

import "dotenv/config";
import { and, eq, ilike, count } from "drizzle-orm";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { comments, documents } from "@/db/schema";
import { db } from "@/lib/db";
import { getOrCreateLegacyCollectRun } from "@/lib/legacy-import/services/get-or-create-legacy-collect-run";
import { importLegacyCommentsBatch } from "@/lib/legacy-import/services/import-legacy-comments-batch";
import { importLegacyPostsBatch } from "@/lib/legacy-import/services/import-legacy-posts-batch";
import type {
  ImportLegacyBatchResult,
  LegacyCommentPhase,
} from "@/lib/legacy-import/types";

const SCRIPT = "import-legacy-content";

const optionsSchema = z
  .object({
    batchSize: z.coerce.number().int().min(1).max(500),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

type Totals = Omit<ImportLegacyBatchResult, "nextAfterId">;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Import legacy Facebook posts and comments into content_items.")
    .option("--batch-size <n>", "Rows per batch", "200")
    .option("--dry-run", "Count what would be imported without writing", false)
    .option("--yes", "Import into the raw store", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function countLegacyRows() {
  const facebookPosts = and(
    eq(documents.docType, "post"),
    ilike(documents.sourceOriginKey, "%facebook.com%"),
  );

  const [[posts], [postComments], sourceRows] = await Promise.all([
    db.select({ value: count() }).from(documents).where(facebookPosts),
    db
      .select({ value: count() })
      .from(comments)
      .innerJoin(documents, eq(comments.documentId, documents.id))
      .where(facebookPosts),
    db
      .selectDistinct({ key: documents.sourceOriginKey })
      .from(documents)
      .where(facebookPosts),
  ]);

  return {
    posts: posts.value,
    comments: postComments.value,
    sources: sourceRows.length,
  };
}

async function runPhase(
  label: string,
  importBatch: (afterId: string | null) => Promise<ImportLegacyBatchResult>,
): Promise<Totals> {
  const totals: Totals = { read: 0, inserted: 0, updated: 0, skipped: 0 };
  let afterId: string | null = null;

  do {
    const result = await importBatch(afterId);
    totals.read += result.read;
    totals.inserted += result.inserted;
    totals.updated += result.updated;
    totals.skipped += result.skipped;
    afterId = result.nextAfterId;

    console.log(`[${SCRIPT}] ${label}`, totals);
  } while (afterId);

  return totals;
}

async function main() {
  const options = parseArgs();
  const counts = await countLegacyRows();

  console.log(`[${SCRIPT}] Legacy Facebook rows`, {
    ...counts,
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to import.`);
    return;
  }

  const collectRunId = await getOrCreateLegacyCollectRun();
  console.log(`[${SCRIPT}] Using collect run`, { collectRunId });

  const posts = await runPhase("posts", (afterId) =>
    importLegacyPostsBatch({ collectRunId, afterId, limit: options.batchSize }),
  );

  const commentTotals: Record<LegacyCommentPhase, Totals> = {
    comment: await runPhase("comments", (afterId) =>
      importLegacyCommentsBatch({
        collectRunId,
        phase: "comment",
        afterId,
        limit: options.batchSize,
      }),
    ),
    reply: await runPhase("replies", (afterId) =>
      importLegacyCommentsBatch({
        collectRunId,
        phase: "reply",
        afterId,
        limit: options.batchSize,
      }),
    ),
  };

  console.log(`[${SCRIPT}] Done`, { posts, ...commentTotals });
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
