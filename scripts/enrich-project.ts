// Run Enrich for one project without the workflow. Dry run prints what would
// be enriched (no LLM, no writes); --limit caps threads for a quick trial.
//
// Example:
//   npx tsx scripts/enrich-project.ts --project <id> --dry-run
//   npm run enrich:project -- -- --project <id> --only terms --yes
//   npm run enrich:project -- -- --project <id> --only terms,terms_index --force --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { ENRICH_CONFIG } from "@/lib/enrichment/config";
import { ENRICHER_KEYS, type EnricherKey, isEnricherKey } from "@/lib/enrichment/registry";
import { enrichThreads } from "@/lib/enrichment/services/enrich-threads";
import { indexTerms } from "@/lib/enrichment/services/index-terms";
import { loadEnrichContext } from "@/lib/enrichment/services/load-enrich-context";
import { planProjectEnrich } from "@/lib/enrichment/services/plan-project-enrich";
import { resetStageEnrichments } from "@/lib/enrichment/services/reset-stage-enrichments";
import { selectStageEnrichers } from "@/lib/enrichment/utils/pending-enrichments-sql";

const SCRIPT = "enrich-project";

const optionsSchema = z
  .object({
    project: z.uuid(),
    limit: z.coerce.number().int().min(1).optional(),
    only: z.string().optional(),
    force: z.boolean(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

function parseOnly(value: string | undefined): EnricherKey[] | undefined {
  if (!value) return undefined;
  const keys = value.split(",").map((key) => key.trim()).filter(Boolean);
  const unknown = keys.find((key) => !isEnricherKey(key));
  if (unknown) {
    throw new Error(`Unknown enricher "${unknown}". Known: ${ENRICHER_KEYS.join(", ")}`);
  }
  return keys as EnricherKey[];
}

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Enrich the relevant mentions of one project, optionally one enricher at a time.")
    .requiredOption("--project <id>", "Project id")
    .option("--limit <n>", "Enrich at most this many threads")
    .option("--only <keys>", "Comma-separated enricher keys")
    .option("--force", "Run again even when nothing changed", false)
    .option("--dry-run", "Show what would be enriched", false)
    .option("--yes", "Call the model and write results", false);
  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const only = parseOnly(options.only);
  const run = { projectId: options.project, only, force: options.force };
  const ctx = await loadEnrichContext({ projectId: options.project });
  console.log(`[${SCRIPT}] Project`, {
    projectId: ctx.projectId,
    case: ctx.caseLabel,
    aspects: ctx.aspects.length,
    entities: ctx.entities.length,
    enrichers: ctx.enrichers.map((enricher) => enricher.key),
    only: only ?? null,
    force: options.force,
  });

  const plan = await planProjectEnrich(run);
  const rootIds = options.limit ? plan.rootIds.slice(0, options.limit) : plan.rootIds;
  console.log(`[${SCRIPT}] Plan`, {
    pending: plan.pending,
    pendingByKey: plan.pendingByKey,
    threads: plan.rootIds.length,
    running: rootIds.length,
    keys: plan.keys,
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run: pass --yes to call the model and write.`);
    return;
  }

  const started = Date.now();
  const totals = { enriched: 0, failed: 0, llmCalls: 0 };
  for (let offset = 0; offset < rootIds.length; offset += ENRICH_CONFIG.threadsPerStep) {
    const result = await enrichThreads({
      ...run,
      rootIds: rootIds.slice(offset, offset + ENRICH_CONFIG.threadsPerStep),
    });
    totals.enriched += result.enriched;
    totals.failed += result.failed;
    totals.llmCalls += result.llmCalls;
  }

  const stages = selectStageEnrichers(ctx, run);
  if (options.force) {
    for (const key of stages) {
      console.log(`[${SCRIPT}] Reset stage`, { key, rows: await resetStageEnrichments({ projectId: ctx.projectId, key }) });
    }
  }
  if (stages.includes("terms_index")) {
    let indexed = 0;
    for (;;) {
      const result = await indexTerms({ projectId: ctx.projectId });
      indexed += result.indexed;
      if (!result.more) break;
    }
    console.log(`[${SCRIPT}] Terms index`, { indexed });
  }

  console.log(`[${SCRIPT}] Done`, { ...totals, seconds: (Date.now() - started) / 1000 });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
