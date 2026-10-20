// Run Match for one project without the workflow: tier 1, tier 2 per thread,
// then drop stale mentions. Dry run prints the tier 1 plan only (no LLM, no writes).
//
// Example:
//   npx tsx scripts/match-project.ts --project <id> --dry-run
//   npm run match:project -- -- --project <id> --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { MATCH_CONFIG } from "@/lib/matching/config";
import { finalizeProjectMatch } from "@/lib/matching/services/finalize-project-match";
import { judgeThreads } from "@/lib/matching/services/judge-threads";
import { loadMatchItems } from "@/lib/matching/services/load-match-items";
import { loadProjectMatchContext } from "@/lib/matching/services/load-project-match-context";
import { matchProjectLexical } from "@/lib/matching/services/match-project-lexical";
import { planItemMatches } from "@/lib/matching/utils/plan-item-matches";

const SCRIPT = "match-project";

const optionsSchema = z
  .object({
    project: z.uuid(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Match one project against the raw store (full run).")
    .requiredOption("--project <id>", "Project id")
    .option("--dry-run", "Print the tier 1 plan without writing", false)
    .option("--yes", "Run tier 1 + tier 2 and write mentions", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const ctx = await loadProjectMatchContext({ projectId: options.project });
  console.log(`[${SCRIPT}] Project`, {
    projectId: ctx.projectId,
    sources: ctx.sourceIds.length,
    queries: ctx.queries.length,
    signature: ctx.signature,
    storedSignature: ctx.storedSignature,
  });

  if (!options.yes) {
    const items = await loadMatchItems({ sourceIds: ctx.sourceIds });
    const roots = new Map(
      items.filter((item) => item.kind === "post").map((item) => [item.id, item]),
    );
    const plan = planItemMatches({ items, roots, queries: ctx.queries });
    const pendingThreads = new Set(plan.pending.map(({ item }) => item.rootId ?? item.id));
    console.log(`[${SCRIPT}] Tier 1 plan`, {
      items: items.length,
      certain: plan.certain.length,
      pendingDirect: plan.pending.filter((match) => match.matchType === "direct").length,
      pendingContext: plan.pending.filter((match) => match.matchType === "context").length,
      threadsForTier2: pendingThreads.size,
    });
    console.log(`[${SCRIPT}] Dry run. Pass --yes to write mentions.`);
    return;
  }

  const started = Date.now();
  const lexical = await matchProjectLexical({ projectId: ctx.projectId });
  console.log(`[${SCRIPT}] Tier 1`, lexical.stats, {
    threadsForTier2: lexical.pendingRootIds.length,
  });

  const totals = { judged: 0, cached: 0, llmCalls: 0, relevant: 0 };
  const roots = lexical.pendingRootIds;
  for (let offset = 0; offset < roots.length; offset += MATCH_CONFIG.threadsPerStep) {
    const result = await judgeThreads({
      projectId: ctx.projectId,
      rootIds: roots.slice(offset, offset + MATCH_CONFIG.threadsPerStep),
    });
    totals.judged += result.judged;
    totals.cached += result.cached;
    totals.llmCalls += result.llmCalls;
    totals.relevant += result.relevant;
  }
  console.log(`[${SCRIPT}] Tier 2`, totals);

  const finalized = await finalizeProjectMatch({
    projectId: ctx.projectId,
    signature: lexical.signature,
  });
  console.log(`[${SCRIPT}] Done`, { ...finalized, seconds: (Date.now() - started) / 1000 });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
