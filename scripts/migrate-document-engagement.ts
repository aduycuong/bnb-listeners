// One-off migration for documents written before engagement moved into columns.
//
// Two steps, both about engagement:
//   1. Lift the counters out of the old Facebook metadata shape into
//      documents.{like,comment,share,view}_count.
//   2. Strip the engagement footer from raw_content, so the body matches what
//      ingestion produces today and the next scrape takes the cheap
//      "unchanged" path instead of re-embedding everything.
//
// Run this BEFORE scripts/rebuild-chunks.ts — that script refuses to run while
// any document still carries the footer.
//
// Example:
//   npx tsx scripts/migrate-document-engagement.ts --dry-run
//   npx tsx scripts/migrate-document-engagement.ts --yes

import "dotenv/config";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { documents } from "@/db/schema";
import { db } from "@/lib/db";
import {
  LEGACY_ENGAGEMENT_TAIL_MARKER,
  stripEngagementTail,
} from "@/lib/documents/utils/strip-engagement-tail";

const SCRIPT = "migrate-document-engagement";
const UPDATE_BATCH_SIZE = 200;

const legacyTailFilter = sql`${documents.rawContent} LIKE ${`%${LEGACY_ENGAGEMENT_TAIL_MARKER}%`}`;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const optionsSchema = z
  .object({
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((o) => !(o.dryRun && o.yes), {
    error: "Choose one: --dry-run or --yes",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npx tsx scripts/migrate-document-engagement.ts [options]

Moves legacy engagement data onto the current document shape: counters from
metadata into columns, and the engagement footer out of raw_content.

Options:
  --dry-run   Report what would change without writing (default when neither flag given)
  --yes       Apply the migration
  --help      Show this help

Examples:
  npx tsx scripts/migrate-document-engagement.ts --dry-run
  npx tsx scripts/migrate-document-engagement.ts --yes
`);
    process.exit(0);
  }

  const raw = { dryRun: false, yes: false };

  for (const arg of args) {
    if (arg === "--dry-run") raw.dryRun = true;
    else if (arg === "--yes") raw.yes = true;
    else {
      console.error(`[${SCRIPT}] Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  if (!raw.dryRun && !raw.yes) raw.dryRun = true;

  const result = optionsSchema.safeParse(raw);

  if (!result.success) {
    for (const issue of result.error.issues) {
      console.error(`[${SCRIPT}] ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function countLegacyMetadataRows(): Promise<number> {
  const rows = await db.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count
    FROM documents
    WHERE metadata->>'likes' ~ '^[0-9]+$'
       OR metadata->>'numComments' ~ '^[0-9]+$'
       OR metadata->>'numShares' ~ '^[0-9]+$'
       OR metadata->>'videoViewCount' ~ '^[0-9]+$'
  `);

  return Number(rows.rows[0]?.count ?? 0);
}

async function countLegacyTailRows(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(legacyTailFilter);

  return row?.count ?? 0;
}

/**
 * Copies the counters from the old Facebook metadata shape into the columns.
 * Each cast is guarded by a digit check so one malformed value cannot abort
 * the statement, and COALESCE leaves a column untouched when its key is absent.
 */
async function backfillEngagement(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE documents
    SET like_count    = COALESCE(NULLIF(metadata->>'likes', '')::int, like_count),
        comment_count = COALESCE(NULLIF(metadata->>'numComments', '')::int, comment_count),
        share_count   = COALESCE(NULLIF(metadata->>'numShares', '')::int, share_count),
        view_count    = COALESCE(NULLIF(metadata->>'videoViewCount', '')::int, view_count)
    WHERE metadata->>'likes' ~ '^[0-9]+$'
       OR metadata->>'numComments' ~ '^[0-9]+$'
       OR metadata->>'numShares' ~ '^[0-9]+$'
       OR metadata->>'videoViewCount' ~ '^[0-9]+$'
  `);

  return result.rowCount ?? 0;
}

/** Rewrites raw_content without the engagement footer. */
async function stripLegacyTails(): Promise<number> {
  const rows = await db
    .select({ id: documents.id, rawContent: documents.rawContent })
    .from(documents)
    .where(legacyTailFilter);

  const updates: { id: string; stripped: string }[] = [];

  for (const row of rows) {
    const stripped = stripEngagementTail(row.rawContent);
    if (stripped !== row.rawContent) updates.push({ id: row.id, stripped });
  }

  for (let start = 0; start < updates.length; start += UPDATE_BATCH_SIZE) {
    const batch = updates.slice(start, start + UPDATE_BATCH_SIZE);

    await Promise.all(
      batch.map((row) =>
        db
          .update(documents)
          .set({ rawContent: row.stripped })
          .where(sql`${documents.id} = ${row.id}::uuid`),
      ),
    );
  }

  return updates.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";

  console.log(`[${SCRIPT}] Starting`, { mode });

  const [metadataRows, tailRows] = await Promise.all([
    countLegacyMetadataRows(),
    countLegacyTailRows(),
  ]);

  console.log(`[${SCRIPT}] Scope`, {
    documentsWithLegacyMetadataCounters: metadataRows,
    documentsWithEngagementFooter: tailRows,
  });

  if (metadataRows === 0 && tailRows === 0) {
    console.log(`[${SCRIPT}] Nothing to migrate.`);
    return;
  }

  if (options.dryRun) {
    console.log(
      `[${SCRIPT}] Dry-run — nothing written. Run with --yes to apply.`,
    );
    return;
  }

  const backfilled = await backfillEngagement();
  console.log(`[${SCRIPT}] Backfilled engagement columns: ${backfilled} document(s)`);

  const stripped = await stripLegacyTails();
  console.log(`[${SCRIPT}] Stripped engagement footer: ${stripped} document(s)`);

  console.log(
    `[${SCRIPT}] Done. Next: npm run chunks:rebuild -- --dry-run`,
  );
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
