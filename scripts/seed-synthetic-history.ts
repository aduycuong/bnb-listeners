// Seed synthetic threads spread over past days from a scenario file, so
// period reports (Topics growth, trends) have data before today. Each segment
// is one brief with its own window and post count; the runs then go through
// Match, Enrich and Topic like any collect run.
//
// Re-running adds the threads again; clean up with `npm run source:delete-content`.
//
// Example (the extra `--` is required in PowerShell: npm.ps1 consumes the first one):
//   npm run synthetic:seed-history -- -- --scenario scripts/synthetic-scenarios/lavita-topic-history.json --dry-run
//   npm run synthetic:seed-history -- -- --scenario scripts/synthetic-scenarios/lavita-topic-history.json --yes

import "dotenv/config";
import { readFile } from "node:fs/promises";

import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { SYNTHETIC_CONFIG } from "@/lib/personas/config";
import { registerSyntheticSource } from "@/lib/personas/services/register-synthetic-source";
import { resolvePanel } from "@/lib/personas/services/resolve-panel";
import { startSyntheticGeneration } from "@/lib/personas/services/start-synthetic-generation";

const SCRIPT = "seed-synthetic-history";
const DAY_MS = 24 * 60 * 60 * 1000;
/** Seeds of segment `i` start at `seed + i * SEED_STRIDE`, leaving room for its runs. */
const SEED_STRIDE = 100;

const commentsSchema = z
  .tuple([z.int().min(0).max(200), z.int().min(0).max(200)])
  .refine(([min, max]) => min <= max, { error: "commentsPerPost must be [min, max]." });

const scenarioSchema = z.object({
  description: z.string().optional(),
  panel: z.string().min(1),
  source: z.string().min(1),
  seed: z.int().min(0),
  commentsPerPost: commentsSchema.default([0, 12]),
  styleSource: z.uuid().optional(),
  segments: z
    .array(
      z
        .object({
          brief: z.string().trim().min(1).max(2000),
          posts: z.int().min(1).max(500),
          /** Window in days before now; `toDays: 0` ends now. */
          fromDays: z.number().min(0),
          toDays: z.number().min(0),
          commentsPerPost: commentsSchema.optional(),
          distractors: z.array(z.string().min(1)).default([]),
        })
        .refine((segment) => segment.fromDays > segment.toDays, {
          error: "fromDays must be greater than toDays.",
        }),
    )
    .min(1),
});

const optionsSchema = z
  .object({ scenario: z.string().min(1), dryRun: z.boolean(), yes: z.boolean() })
  .refine((value) => !(value.dryRun && value.yes), { message: "Choose one: --dry-run or --yes." });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Seed synthetic threads over past days from a scenario file.")
    .requiredOption("--scenario <path>", "Scenario JSON (see scripts/synthetic-scenarios/)")
    .option("--dry-run", "Show the segments without writing", false)
    .option("--yes", "Register the source and start the runs", false);
  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const scenario = scenarioSchema.parse(JSON.parse(await readFile(options.scenario, "utf8")));
  const panel = await resolvePanel(scenario.panel);
  const now = Date.now();

  const segments = scenario.segments.map((segment, index) => ({
    ...segment,
    commentsPerPost: segment.commentsPerPost ?? scenario.commentsPerPost,
    seed: scenario.seed + index * SEED_STRIDE,
    window: {
      from: new Date(now - segment.fromDays * DAY_MS).toISOString(),
      to: new Date(now - segment.toDays * DAY_MS).toISOString(),
    },
  }));

  console.log(`[${SCRIPT}] Plan`, {
    panel: panel.name,
    source: scenario.source,
    posts: segments.reduce((sum, segment) => sum + segment.posts, 0),
    runs: segments.reduce(
      (sum, segment) => sum + Math.ceil(segment.posts / SYNTHETIC_CONFIG.maxThreadsPerRun),
      0,
    ),
    model: SYNTHETIC_CONFIG.model,
    mode: options.yes ? "apply" : "dry-run",
  });
  console.table(
    segments.map((segment) => ({
      days: `${segment.fromDays} → ${segment.toDays}`,
      posts: segment.posts,
      comments: segment.commentsPerPost.join("–"),
      brief: segment.brief.slice(0, 70),
    })),
  );

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to start generation.`);
    return;
  }

  const { sourceId, created } = await registerSyntheticSource({ name: scenario.source });
  console.log(`[${SCRIPT}] Source`, { sourceId, created });

  for (const segment of segments) {
    const result = await startSyntheticGeneration({
      panelId: panel.id,
      sourceId,
      brief: segment.brief,
      posts: segment.posts,
      commentsPerPost: segment.commentsPerPost,
      window: segment.window,
      seed: segment.seed,
      styleSourceId: scenario.styleSource,
      distractors: segment.distractors,
    });
    console.log(`[${SCRIPT}] Segment ${segment.fromDays} → ${segment.toDays} days`, result);
  }
  console.log(`[${SCRIPT}] Runs started; Match, Enrich and Topic follow each run.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, { error });
    process.exit(1);
  });
