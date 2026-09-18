// Backfill `terms.embedding` for terms that have none (or re-embed every term).
//
// Classification matches LLM-proposed terms against existing terms by vector
// similarity, so a term without an embedding is invisible to that step until
// this script (or a later admin edit) embeds it. Run once after the migration
// that adds the column, and again with --all after changing the embedding
// model or `buildTermEmbeddingText`.
//
// Example:
//   npx tsx scripts/embed-terms.ts --dry-run
//   npx tsx scripts/embed-terms.ts --yes
//   npx tsx scripts/embed-terms.ts --all --yes
//   npx tsx scripts/embed-terms.ts --workspace-id <uuid> --yes

import "dotenv/config";

// Bulk embedding emits one LangSmith trace per request; disable tracing for
// this process only so the monthly trace quota is not consumed.
process.env.LANGCHAIN_TRACING_V2 = "false";
process.env.LANGSMITH_TRACING = "false";

import { and, eq, isNull, type SQL } from "drizzle-orm";
import { z } from "zod";

import { terms } from "@/db/schema";
import { db } from "@/lib/db";
import { refreshTermEmbeddings } from "@/lib/terms/services/refresh-term-embeddings";

const SCRIPT = "embed-terms";

/** Terms per embedding request. */
const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const optionsSchema = z
  .object({
    dryRun: z.boolean(),
    yes: z.boolean(),
    all: z.boolean(),
    workspaceId: z.uuid().optional(),
  })
  .refine((o) => !(o.dryRun && o.yes), {
    error: "Choose one: --dry-run or --yes",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npx tsx scripts/embed-terms.ts [options]

Embeds term name + description into terms.embedding. By default only terms
without an embedding are processed.

Options:
  --dry-run              Report how many terms would be embedded (default when neither flag given)
  --yes                  Apply
  --all                  Re-embed every term, not just those missing an embedding
  --workspace-id <uuid>  Limit to one workspace
  --help                 Show this help

Examples:
  npx tsx scripts/embed-terms.ts --dry-run
  npx tsx scripts/embed-terms.ts --yes
  npx tsx scripts/embed-terms.ts --all --yes
`);
    process.exit(0);
  }

  const raw: {
    dryRun: boolean;
    yes: boolean;
    all: boolean;
    workspaceId?: string;
  } = { dryRun: false, yes: false, all: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") raw.dryRun = true;
    else if (arg === "--yes") raw.yes = true;
    else if (arg === "--all") raw.all = true;
    else if (arg === "--workspace-id") {
      raw.workspaceId = args[++i];
    } else {
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
// Helpers
// ---------------------------------------------------------------------------

function buildScopeFilter(options: Options): SQL | undefined {
  const conditions: SQL[] = [];

  if (!options.all) {
    conditions.push(isNull(terms.embedding));
  }

  if (options.workspaceId) {
    conditions.push(eq(terms.workspaceId, options.workspaceId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function loadTargetTermIds(options: Options): Promise<string[]> {
  const rows = await db
    .select({ id: terms.id })
    .from(terms)
    .where(buildScopeFilter(options))
    .orderBy(terms.createdAt);

  return rows.map((row) => row.id);
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";

  console.log(`[${SCRIPT}] Starting`, {
    mode,
    all: options.all,
    workspaceId: options.workspaceId ?? "(all)",
  });

  const termIds = await loadTargetTermIds(options);

  console.log(`[${SCRIPT}] Scope`, {
    termsToEmbed: termIds.length,
    batches: Math.ceil(termIds.length / BATCH_SIZE),
  });

  if (options.dryRun) {
    console.log(
      `[${SCRIPT}] Dry-run — nothing written. Run with --yes to apply.`,
    );
    return;
  }

  let embedded = 0;
  let failedBatches = 0;

  for (const batch of chunk(termIds, BATCH_SIZE)) {
    try {
      const result = await refreshTermEmbeddings({ termIds: batch });
      embedded += result.embedded;
    } catch (error) {
      failedBatches++;
      console.error(
        `\n[${SCRIPT}] Failed to embed batch starting at ${batch[0]}:`,
        error instanceof Error ? error.message : error,
      );
    }

    process.stdout.write(
      `\r[${SCRIPT}] Embedded ${embedded} / ${termIds.length} terms`,
    );
  }

  console.log(
    `\n[${SCRIPT}] Done. Terms embedded: ${embedded}, failed batches: ${failedBatches}.`,
  );
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
