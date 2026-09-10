// Rebuild every document's chunks with the social-chunks pipeline.
//
// Run this after changing how chunks are built — splitting rules, context
// prefix, embedding model. It re-chunks and re-embeds every eligible document,
// then sweeps away chunks left behind by a superseded strategy.
//
// Example:
//   npx tsx scripts/rebuild-chunks.ts --dry-run
//   npx tsx scripts/rebuild-chunks.ts --yes

import "dotenv/config";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { documents } from "@/db/schema";
import { QUALITY_SCORE_THRESHOLD } from "@/lib/chunking/config";
import { rebuildDocumentChunks } from "@/lib/chunking/services/rebuild-document-chunks";
import { SOCIAL_CONTENT_STRATEGY } from "@/lib/chunking/utils/social-chunks/config";
import { db } from "@/lib/db";

const SCRIPT = "rebuild-chunks";

/** USD per 1M tokens for text-embedding-3-small, for the dry-run estimate only. */
const EMBEDDING_USD_PER_MTOK = 0.02;

/** Rough chars-per-token for mixed Vietnamese/English text. */
const CHARS_PER_TOKEN = 3.5;

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
Usage: npx tsx scripts/rebuild-chunks.ts [options]

Deletes every existing chunk and rebuilds it with the social-chunks pipeline.
Documents below the quality threshold are skipped.

Options:
  --dry-run   Report what would change without writing (default when neither flag given)
  --yes       Apply the rebuild
  --help      Show this help

Examples:
  npx tsx scripts/rebuild-chunks.ts --dry-run
  npx tsx scripts/rebuild-chunks.ts --yes
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

/**
 * Removes chunks the rebuild loop could not overwrite — anything tagged with a
 * strategy other than the current one, plus chunks whose document has since
 * dropped below the quality threshold and is no longer rebuilt.
 */
async function sweepStaleChunks(): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM chunks
    WHERE metadata->>'strategy' IS DISTINCT FROM ${SOCIAL_CONTENT_STRATEGY}
  `);

  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Scope reporting
// ---------------------------------------------------------------------------

type Scope = {
  totalDocuments: number;
  eligibleDocuments: number;
  existingChunks: number;
  contentCharacters: number;
};

async function loadScope(): Promise<Scope> {
  const rows = await db.execute<{
    total_documents: number;
    eligible_documents: number;
    existing_chunks: number;
    content_characters: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM documents) AS total_documents,
      (SELECT count(*)::int FROM documents
        WHERE quality_score >= ${QUALITY_SCORE_THRESHOLD}) AS eligible_documents,
      (SELECT count(*)::int FROM chunks) AS existing_chunks,
      (SELECT COALESCE(sum(length(raw_content)), 0)::int FROM documents
        WHERE quality_score >= ${QUALITY_SCORE_THRESHOLD}) AS content_characters
  `);

  const row = rows.rows[0];

  return {
    totalDocuments: Number(row?.total_documents ?? 0),
    eligibleDocuments: Number(row?.eligible_documents ?? 0),
    existingChunks: Number(row?.existing_chunks ?? 0),
    contentCharacters: Number(row?.content_characters ?? 0),
  };
}

function estimateCostUsd(characters: number): number {
  const tokens = characters / CHARS_PER_TOKEN;
  return (tokens / 1_000_000) * EMBEDDING_USD_PER_MTOK;
}

async function loadEligibleDocumentIds(): Promise<string[]> {
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(sql`${documents.qualityScore} >= ${QUALITY_SCORE_THRESHOLD}`)
    .orderBy(documents.createdAt);

  return rows.map((row) => row.id);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";

  console.log(`[${SCRIPT}] Starting`, { mode });

  const scope = await loadScope();

  console.log(`[${SCRIPT}] Scope`, {
    totalDocuments: scope.totalDocuments,
    eligibleDocuments: scope.eligibleDocuments,
    skippedBelowQuality: scope.totalDocuments - scope.eligibleDocuments,
    qualityThreshold: QUALITY_SCORE_THRESHOLD,
    existingChunksToReplace: scope.existingChunks,
    estimatedEmbeddingCostUsd: estimateCostUsd(scope.contentCharacters).toFixed(4),
  });

  if (options.dryRun) {
    console.log(
      `[${SCRIPT}] Dry-run — nothing written. Run with --yes to apply.`,
    );
    return;
  }

  const documentIds = await loadEligibleDocumentIds();
  let rebuilt = 0;
  let chunksCreated = 0;
  let failed = 0;

  for (const documentId of documentIds) {
    try {
      const result = await rebuildDocumentChunks({ documentId });
      rebuilt++;
      chunksCreated += result.chunksCreated;
    } catch (error) {
      failed++;
      console.error(
        `\n[${SCRIPT}] Failed to rebuild document ${documentId}:`,
        error instanceof Error ? error.message : error,
      );
    }

    process.stdout.write(
      `\r[${SCRIPT}] Rebuilt ${rebuilt + failed} / ${documentIds.length} documents (${chunksCreated} chunks)`,
    );
  }

  const swept = await sweepStaleChunks();

  console.log(
    `\n[${SCRIPT}] Done. Documents rebuilt: ${rebuilt}, failed: ${failed}, ` +
      `chunks written: ${chunksCreated}, stale chunks swept: ${swept}.`,
  );
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
