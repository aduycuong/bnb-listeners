// Rebuild every document's chunks from its scored parts.
//
// Run this after changing how chunks are built — splitting rules, context
// prefix, embedding model. By default it re-chunks and re-embeds every document
// that already has at least one eligible part (no LLM calls). Pass --rescore
// to first rebuild and re-score parts with the LLM for every document — this
// re-downloads media to R2 and costs one text call plus one vision call per
// image. Afterwards it sweeps chunks left behind by a superseded strategy.
//
// Example:
//   npx tsx scripts/rebuild-chunks.ts --dry-run
//   npx tsx scripts/rebuild-chunks.ts --yes
//   npx tsx scripts/rebuild-chunks.ts --rescore --yes

import "dotenv/config";

// Bulk rebuilds emit one LangSmith trace per LLM/embedding call and quickly
// exhaust the monthly trace quota (429 "Monthly unique traces usage limit
// exceeded"). Disable tracing for this process only; `.env` stays untouched
// so the app keeps tracing normally.
process.env.LANGCHAIN_TRACING_V2 = "false";
process.env.LANGSMITH_TRACING = "false";

import { sql } from "drizzle-orm";
import { z } from "zod";

import { rebuildDocumentChunks } from "@/lib/chunking/services/rebuild-document-chunks";
import { SOCIAL_CONTENT_STRATEGY } from "@/lib/chunking/utils/social-chunks/config";
import { db } from "@/lib/db";
import { scoreDocument } from "@/lib/scoring/services/score-document";

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
    rescore: z.boolean(),
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

Deletes every existing chunk and rebuilds it from scored document parts.
Without --rescore only documents that already have an eligible part are
rebuilt and no LLM is called.

Options:
  --dry-run   Report what would change without writing (default when neither flag given)
  --yes       Apply the rebuild
  --rescore   Rebuild + re-score parts with the LLM for every document first
              (downloads media to R2; 1 text call + 1 vision call per image)
  --help      Show this help

Examples:
  npx tsx scripts/rebuild-chunks.ts --dry-run
  npx tsx scripts/rebuild-chunks.ts --yes
  npx tsx scripts/rebuild-chunks.ts --rescore --yes
`);
    process.exit(0);
  }

  const raw = { dryRun: false, yes: false, rescore: false };

  for (const arg of args) {
    if (arg === "--dry-run") raw.dryRun = true;
    else if (arg === "--yes") raw.yes = true;
    else if (arg === "--rescore") raw.rescore = true;
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
 * strategy other than the current one, plus chunks whose document no longer
 * has an eligible part and so is not rebuilt.
 */
async function sweepStaleChunks(): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM chunks
    WHERE metadata->>'strategy' IS DISTINCT FROM ${SOCIAL_CONTENT_STRATEGY}
       OR NOT EXISTS (
         SELECT 1 FROM document_parts p
         WHERE p.document_id = chunks.document_id AND p.is_eligible = true
       )
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
  eligibleTextCharacters: number;
  totalMediaUrls: number;
};

async function loadScope(): Promise<Scope> {
  const rows = await db.execute<{
    total_documents: number;
    eligible_documents: number;
    existing_chunks: number;
    eligible_text_characters: number;
    total_media_urls: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM documents) AS total_documents,
      (SELECT count(DISTINCT document_id)::int FROM document_parts
        WHERE is_eligible = true) AS eligible_documents,
      (SELECT count(*)::int FROM chunks) AS existing_chunks,
      (SELECT COALESCE(sum(length(value)), 0)::int FROM document_parts
        WHERE is_eligible = true AND content_type = 'text') AS eligible_text_characters,
      (SELECT COALESCE(sum(
          COALESCE(jsonb_array_length(metadata->'imageUrls'), 0)
        + COALESCE(jsonb_array_length(metadata->'videoUrls'), 0)
      ), 0)::int FROM documents
        WHERE jsonb_typeof(metadata->'imageUrls') = 'array'
           OR jsonb_typeof(metadata->'videoUrls') = 'array') AS total_media_urls
  `);

  const row = rows.rows[0];

  return {
    totalDocuments: Number(row?.total_documents ?? 0),
    eligibleDocuments: Number(row?.eligible_documents ?? 0),
    existingChunks: Number(row?.existing_chunks ?? 0),
    eligibleTextCharacters: Number(row?.eligible_text_characters ?? 0),
    totalMediaUrls: Number(row?.total_media_urls ?? 0),
  };
}

function estimateEmbeddingCostUsd(characters: number): number {
  const tokens = characters / CHARS_PER_TOKEN;
  return (tokens / 1_000_000) * EMBEDDING_USD_PER_MTOK;
}

async function loadAllDocumentIds(): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT id FROM documents ORDER BY created_at
  `);

  return rows.rows.map((row) => row.id);
}

async function loadEligibleDocumentIds(): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    SELECT d.id
    FROM documents d
    WHERE EXISTS (
      SELECT 1 FROM document_parts p
      WHERE p.document_id = d.id AND p.is_eligible = true
    )
    ORDER BY d.created_at
  `);

  return rows.rows.map((row) => row.id);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";

  console.log(`[${SCRIPT}] Starting`, { mode, rescore: options.rescore });

  const scope = await loadScope();

  console.log(`[${SCRIPT}] Scope`, {
    totalDocuments: scope.totalDocuments,
    eligibleDocuments: scope.eligibleDocuments,
    withoutEligiblePart: scope.totalDocuments - scope.eligibleDocuments,
    existingChunksToReplace: scope.existingChunks,
    estimatedEmbeddingCostUsd: estimateEmbeddingCostUsd(
      scope.eligibleTextCharacters,
    ).toFixed(4),
    ...(options.rescore && {
      rescoreLlmCalls: {
        text: scope.totalDocuments,
        visionUpTo: scope.totalMediaUrls,
      },
    }),
  });

  if (options.dryRun) {
    console.log(
      `[${SCRIPT}] Dry-run — nothing written. Run with --yes to apply.`,
    );
    return;
  }

  const documentIds = options.rescore
    ? await loadAllDocumentIds()
    : await loadEligibleDocumentIds();

  let rebuilt = 0;
  let rescored = 0;
  let chunksCreated = 0;
  let failed = 0;

  for (const documentId of documentIds) {
    try {
      if (options.rescore) {
        await scoreDocument({ documentId });
        rescored++;
      }

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
      `\r[${SCRIPT}] Processed ${rebuilt + failed} / ${documentIds.length} documents (${chunksCreated} chunks)`,
    );
  }

  const swept = await sweepStaleChunks();

  console.log(
    `\n[${SCRIPT}] Done. Documents rescored: ${rescored}, rebuilt: ${rebuilt}, failed: ${failed}, ` +
      `chunks written: ${chunksCreated}, stale chunks swept: ${swept}.`,
  );
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
