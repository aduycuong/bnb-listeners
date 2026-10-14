// Generate synthetic posts, comments and replies from a persona panel into the
// raw store (`origin = synthetic`). Each run is a `synthetic-threads` collect
// run; a large --posts is split into several runs.
//
// Example:
//   npx tsx scripts/generate-synthetic-data.ts --panel real-estate-review-group --source "Review BĐS giả" --brief "Chủ đầu tư dự án X thông báo lùi bàn giao 6 tháng" --posts 10
//   npm run synthetic:generate -- --panel real-estate-review-group --source "Review BĐS giả" --brief "..." --posts 10 --wait --yes

import "dotenv/config";
import { Command } from "commander";
import { inArray } from "drizzle-orm";
import { z } from "zod";

import { collectRuns } from "@/db/schema";
import { db } from "@/lib/db";
import { chatModelIdSchema } from "@/lib/langchain/models/registry";
import { SYNTHETIC_CONFIG } from "@/lib/personas/config";
import { registerSyntheticSource } from "@/lib/personas/services/register-synthetic-source";
import { resolvePanel } from "@/lib/personas/services/resolve-panel";
import { startSyntheticGeneration } from "@/lib/personas/services/start-synthetic-generation";

const SCRIPT = "generate-synthetic-data";
const POLL_INTERVAL_MS = 5_000;
const WAIT_TIMEOUT_MS = 20 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const optionsSchema = z
  .object({
    panel: z.string().min(1),
    source: z.string().min(1),
    brief: z.string().min(1).max(2000),
    posts: z.coerce.number().int().min(1).max(500).default(10),
    minComments: z.coerce.number().int().min(0).max(200).default(0),
    maxComments: z.coerce.number().int().min(0).max(200).default(12),
    hours: z.coerce.number().min(1).max(24 * 30).default(24),
    seed: z.coerce.number().int().min(0).optional(),
    model: chatModelIdSchema.optional(),
    styleSource: z.uuid().optional(),
    distractor: z.array(z.string().min(1)).default([]),
    target: z.string().min(1).optional(),
    wait: z.boolean(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => value.minComments <= value.maxComments, {
    message: "--min-comments must not exceed --max-comments.",
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Generate synthetic threads from a persona panel.")
    .requiredOption("--panel <ref>", "Panel id, template key or exact name")
    .requiredOption("--source <name>", "Synthetic group name (created if missing)")
    .requiredOption("--brief <text>", "What happened; goes into every prompt")
    .option("--posts <n>", "Threads to generate", "10")
    .option("--min-comments <n>", "Fewest comments per post", "0")
    .option("--max-comments <n>", "Most comments per post", "12")
    .option("--hours <n>", "Spread posts over the last N hours", "24")
    .option("--seed <n>", "Fix the plan (counts, times, persona allocation)")
    .option("--model <id>", `Chat model (default ${SYNTHETIC_CONFIG.model})`)
    .option("--style-source <id>", "Source id whose real comments are voice examples")
    .option(
      "--distractor <text>",
      "Look-alike sentence mixed in as noise; repeatable",
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .option("--target <name>", "Entity the threads are about; labels items for Match evaluation")
    .option("--wait", "Wait for the runs and print their duration", false)
    .option("--dry-run", "Show what would run without writing", false)
    .option("--yes", "Register the source and start the runs", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const panel = await resolvePanel(options.panel);

  console.log(`[${SCRIPT}] Plan`, {
    panel: panel.name,
    source: options.source,
    posts: options.posts,
    runs: Math.ceil(options.posts / SYNTHETIC_CONFIG.maxThreadsPerRun),
    commentsPerPost: [options.minComments, options.maxComments],
    hours: options.hours,
    model: options.model ?? SYNTHETIC_CONFIG.model,
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to start generation.`);
    return;
  }

  const { sourceId, created } = await registerSyntheticSource({
    name: options.source,
  });
  console.log(`[${SCRIPT}] Source`, { sourceId, created });

  const now = Date.now();
  const result = await startSyntheticGeneration({
    panelId: panel.id,
    sourceId,
    brief: options.brief,
    posts: options.posts,
    commentsPerPost: [options.minComments, options.maxComments],
    window: {
      from: new Date(now - options.hours * HOUR_MS).toISOString(),
      to: new Date(now).toISOString(),
    },
    seed: options.seed,
    model: options.model,
    styleSourceId: options.styleSource,
    distractors: options.distractor,
    target: options.target,
  });
  console.log(`[${SCRIPT}] Runs started`, result);

  if (options.wait) await waitForRuns(result.collectRunIds);
}

async function waitForRuns(collectRunIds: string[]) {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const runs = await db
      .select()
      .from(collectRuns)
      .where(inArray(collectRuns.id, collectRunIds));

    const open = runs.filter(
      (run) => run.status === "pending" || run.status === "running",
    );

    if (open.length === 0) {
      for (const run of runs) {
        const durationSeconds =
          run.startedAt && run.finishedAt
            ? (run.finishedAt.getTime() - run.startedAt.getTime()) / 1000
            : null;
        console.log(`[${SCRIPT}] Run ${run.id}`, {
          status: run.status,
          durationSeconds,
          itemCount: run.itemCount,
          stats: run.stats,
          error: run.error,
        });
      }
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.warn(`[${SCRIPT}] Gave up waiting; check collect_runs.`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
