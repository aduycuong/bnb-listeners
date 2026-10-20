// Export legacy documents, comments and data sources to JSONL before the rebuild.
// Read-only. Writes to .local/exports/legacy-<timestamp>/ (git-ignored) by default.
//
// Example:
//   npm run legacy:export
//   npm run legacy:export -- -- --out-dir .local/exports/before-freeze

import "dotenv/config";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import { asc, gt } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { comments, dataSources, documents } from "@/db/schema";
import { db } from "@/lib/db";

const SCRIPT = "export-legacy-documents";
const BATCH_SIZE = 1000;

const optionsSchema = z.object({
  outDir: z.string().min(1).optional(),
});

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Export legacy documents, comments and data sources to JSONL.")
    .option("--out-dir <dir>", "Output directory (default: .local/exports/legacy-<timestamp>)");

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function exportTable(
  table: PgTable,
  idColumn: AnyPgColumn,
  filePath: string,
): Promise<number> {
  const stream = createWriteStream(filePath, { encoding: "utf8" });
  let lastId: string | null = null;
  let count = 0;

  for (;;) {
    const rows: Record<string, unknown>[] = await db
      .select()
      .from(table)
      .where(lastId ? gt(idColumn, lastId) : undefined)
      .orderBy(asc(idColumn))
      .limit(BATCH_SIZE);

    if (rows.length === 0) break;

    for (const row of rows) {
      if (!stream.write(`${JSON.stringify(row)}\n`)) {
        await once(stream, "drain");
      }
    }

    count += rows.length;
    lastId = rows[rows.length - 1].id as string;
    console.log(`  ${path.basename(filePath)}: ${count}`);
  }

  stream.end();
  await once(stream, "finish");
  return count;
}

async function main() {
  const options = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(options.outDir ?? path.join(".local", "exports", `legacy-${timestamp}`));

  await mkdir(outDir, { recursive: true });
  console.log(`[${SCRIPT}] Starting`, { outDir });

  const counts = {
    dataSources: await exportTable(dataSources, dataSources.id, path.join(outDir, "data-sources.jsonl")),
    documents: await exportTable(documents, documents.id, path.join(outDir, "documents.jsonl")),
    comments: await exportTable(comments, comments.id, path.join(outDir, "comments.jsonl")),
  };

  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify({ exportedAt: new Date().toISOString(), counts }, null, 2)}\n`,
  );

  console.log(`[${SCRIPT}] Done.`, counts);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
