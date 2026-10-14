// Run Enrich for one project without the workflow. Dry run prints what would
// be enriched (no LLM, no writes); --limit caps threads for a quick trial.
//
// Example:
//   npx tsx scripts/enrich-project.ts --project <id> --dry-run
//   npm run enrich:project -- --project <id> --limit 3 --yes

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { ENRICH_CONFIG } from "@/lib/enrichment/config";
import { enrichThreads } from "@/lib/enrichment/services/enrich-threads";
import { loadEnrichContext } from "@/lib/enrichment/services/load-enrich-context";
import { planProjectEnrich } from "@/lib/enrichment/services/plan-project-enrich";

const SCRIPT = "enrich-project";

const optionsSchema = z
  .object({
    project: z.uuid(),
    limit: z.coerce.number().int().min(1).optional(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Enrich the relevant mentions of one project.")
    .requiredOption("--project <id>", "Project id")
    .option("--limit <n>", "Enrich at most this many threads")
    .option("--dry-run", "Show what would be enriched", false)
    .option("--yes", "Call the model and write results", false);
  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const ctx = await loadEnrichContext({ projectId: options.project });
  console.log(`[${SCRIPT}] Project`, {
    projectId: ctx.projectId,
    case: ctx.caseLabel,
    aspects: ctx.aspects.length,
    entities: ctx.entities.length,
    extractions: ctx.extractions.map((extraction) => extraction.key),
    signature: ctx.signature,
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run: planning marks irrelevant mentions skipped only with --yes.`);
    return;
  }

  const plan = await planProjectEnrich({ projectId: ctx.projectId });
  const rootIds = options.limit ? plan.rootIds.slice(0, options.limit) : plan.rootIds;
  console.log(`[${SCRIPT}] Plan`, {
    pending: plan.pending,
    skipped: plan.skipped,
    threads: plan.rootIds.length,
    running: rootIds.length,
  });

  const started = Date.now();
  const totals = { enriched: 0, failed: 0, llmCalls: 0 };
  for (let offset = 0; offset < rootIds.length; offset += ENRICH_CONFIG.threadsPerStep) {
    const result = await enrichThreads({
      projectId: ctx.projectId,
      rootIds: rootIds.slice(offset, offset + ENRICH_CONFIG.threadsPerStep),
    });
    totals.enriched += result.enriched;
    totals.failed += result.failed;
    totals.llmCalls += result.llmCalls;
  }
  console.log(`[${SCRIPT}] Done`, { ...totals, seconds: (Date.now() - started) / 1000 });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
