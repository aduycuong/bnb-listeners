// Precision/recall of Match on synthetic items labeled with `metadata.aboutTarget`
// (runs started with `synthetic:generate --target`). Run `match:project` first.
//
// Example:
//   npm run match:eval -- --project <id>

import "dotenv/config";
import { Command } from "commander";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { contentItems, mentions } from "@/db/schema";
import { stripVietnameseDiacritics } from "@/lib/common/strip-vietnamese-diacritics";
import { db } from "@/lib/db";
import { loadMatchItems } from "@/lib/matching/services/load-match-items";
import { loadProjectMatchContext } from "@/lib/matching/services/load-project-match-context";
import { planItemMatches } from "@/lib/matching/utils/plan-item-matches";

const SCRIPT = "evaluate-match";

const optionsSchema = z.object({ project: z.uuid() });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Precision/recall of Match on labeled synthetic items.")
    .requiredOption("--project <id>", "Project id");
  program.parse();
  return optionsSchema.parse(program.opts());
}

function plain(text: string) {
  return stripVietnameseDiacritics(text).toLowerCase().trim();
}

function score(label: string, predicted: Set<string>, truth: Set<string>, ids: string[]) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const id of ids) {
    const p = predicted.has(id);
    const t = truth.has(id);
    if (p && t) tp += 1;
    else if (p) fp += 1;
    else if (t) fn += 1;
  }
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    label,
    tp,
    fp,
    fn,
    precision: precision.toFixed(3),
    recall: recall.toFixed(3),
    f1: f1.toFixed(3),
  };
}

async function main() {
  const options = parseArgs();
  const ctx = await loadProjectMatchContext({ projectId: options.project });
  const names = new Set(
    [...ctx.entities.values()].flatMap((entity) => [entity.name, ...entity.terms].map(plain)),
  );

  const labeled = await db
    .select({ id: contentItems.id, kind: contentItems.kind, metadata: contentItems.metadata })
    .from(contentItems)
    .where(
      and(
        inArray(contentItems.sourceId, ctx.sourceIds),
        sql`${contentItems.metadata}->>'aboutTarget' is not null`,
      ),
    );
  if (labeled.length === 0) {
    console.log(`[${SCRIPT}] No labeled items in the project's sources. Generate with --target.`);
    return;
  }

  const ids = labeled.map((row) => row.id);
  const truth = new Set(
    labeled
      .filter(
        (row) =>
          row.metadata.aboutTarget === true &&
          typeof row.metadata.target === "string" &&
          names.has(plain(row.metadata.target)),
      )
      .map((row) => row.id),
  );

  const items = await loadMatchItems({ sourceIds: ctx.sourceIds });
  const roots = new Map(
    items.filter((item) => item.kind === "post").map((item) => [item.id, item]),
  );
  const plan = planItemMatches({ items, roots, queries: ctx.queries });
  const direct = new Set([
    ...plan.certain.map(({ item }) => item.id),
    ...plan.pending.filter((match) => match.matchType === "direct").map(({ item }) => item.id),
  ]);
  const inherit = new Set([...direct, ...plan.pending.map(({ item }) => item.id)]);

  const stored = await db
    .select({ id: mentions.contentItemId })
    .from(mentions)
    .where(and(eq(mentions.projectId, ctx.projectId), eq(mentions.isRelevant, true)));
  const final = new Set(stored.map((row) => row.id));

  const byKind = Object.fromEntries(
    ["post", "comment", "reply"].map((kind) => {
      const rows = labeled.filter((row) => row.kind === kind);
      return [kind, `${rows.filter((row) => truth.has(row.id)).length}/${rows.length}`];
    }),
  );
  console.log(`[${SCRIPT}] Labeled items`, { items: ids.length, aboutProject: truth.size, byKind });
  console.table([
    score("Tầng 1 (item nhắc tên)", direct, truth, ids),
    score("Tầng 1 + kế thừa ngữ cảnh (A)", inherit, truth, ids),
    score("Tầng 1 + tầng 2 LLM (B, đã lưu)", final, truth, ids),
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
