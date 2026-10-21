// Run the grouping stage for one project without the workflow (docs/decisions.md D15).
// Dry run prints mention counts by assign status and the current groups.
// --kind selects `topic` (topic_hint) or `buyer_question` (FAQ groups).
// --reset deletes that kind's groups first so they are rebuilt (embeddings are kept).
//
// Example:
//   npx tsx scripts/topics-project.ts --project <id> --dry-run
//   npm run topics:project -- -- --project <id> --yes
//   npm run topics:project -- -- --project <id> --kind buyer_question --yes
//   npm run topics:project -- -- --project <id> --kind buyer_question --reset --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { mentionEnrichments, mentions, topics } from "@/db/schema";
import { db } from "@/lib/db";
import { getTopicStage, TOPIC_CONFIG, TOPIC_STAGE_KINDS } from "@/lib/topics/config";
import { assignTopics } from "@/lib/topics/services/assign-topics";
import { embedTopicHints } from "@/lib/topics/services/embed-topic-hints";
import { mergeSimilarTopics } from "@/lib/topics/services/merge-similar-topics";
import { refreshTopicStats } from "@/lib/topics/services/refresh-topic-stats";
import { resetProjectTopics } from "@/lib/topics/services/reset-project-topics";

const SCRIPT = "topics-project";

const optionsSchema = z
  .object({
    project: z.uuid(),
    kind: z.enum(TOPIC_STAGE_KINDS),
    reset: z.boolean(),
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
    .description("Embed extraction texts and put waiting mentions into existing or new groups for one project.")
    .requiredOption("--project <id>", "Project id")
    .option("--kind <kind>", "Grouping kind: topic or buyer_question", "topic")
    .option("--reset", "Delete this kind's groups first", false)
    .option("--dry-run", "Show the current state", false)
    .option("--yes", "Call the models and write results", false);
  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function printState(projectId: string, kind: Options["kind"]) {
  const spec = getTopicStage(kind);
  const [statuses, rows] = await Promise.all([
    db
      .select({ status: mentionEnrichments.status, mentions: count() })
      .from(mentionEnrichments)
      .innerJoin(mentions, eq(mentions.id, mentionEnrichments.mentionId))
      .where(
        and(
          eq(mentions.projectId, projectId),
          eq(mentions.isRelevant, true),
          eq(mentionEnrichments.enricherKey, spec.enricherKey),
        ),
      )
      .groupBy(mentionEnrichments.status),
    db
      .select({ name: topics.name, status: topics.status, mentions: topics.mentionCount })
      .from(topics)
      .where(and(eq(topics.projectId, projectId), eq(topics.kind, spec.kind), ne(topics.status, "merged")))
      .orderBy(desc(topics.mentionCount)),
  ]);
  console.log(`[${SCRIPT}] Relevant mentions by ${spec.enricherKey} status`, Object.fromEntries(
    statuses.map((row) => [row.status, row.mentions]),
  ));
  console.log(`[${SCRIPT}] ${spec.kind} groups (${rows.length})`);
  for (const row of rows) {
    console.log(`  ${String(row.mentions).padStart(4)}  ${row.name}${row.status === "hidden" ? " (ẩn)" : ""}`);
  }
}

async function main() {
  const options = parseArgs();
  const run = { projectId: options.project, kind: options.kind };
  console.log(`[${SCRIPT}] Config`, { kind: options.kind, ...TOPIC_CONFIG });

  if (!options.yes) {
    await printState(options.project, options.kind);
    console.log(`[${SCRIPT}] Dry run: pass --yes to run.`);
    return;
  }

  const started = Date.now();
  if (options.reset) {
    console.log(`[${SCRIPT}] Reset`, await resetProjectTopics(run));
  }

  let embedded = 0;
  for (;;) {
    const result = await embedTopicHints(run);
    embedded += result.embedded;
    if (!result.more) break;
  }
  console.log(`[${SCRIPT}] Embedded`, { embedded });

  for (;;) {
    const result = await assignTopics(run);
    console.log(`[${SCRIPT}] Assign`, {
      llmCalls: result.llmCalls,
      assigned: result.assigned,
      waiting: result.waiting,
      created: result.created.map((topic) => `${topic.name} (${topic.mentions})`),
    });
    if (!result.more) break;
  }
  await refreshTopicStats(run);
  const merged = await mergeSimilarTopics(run);
  console.log(`[${SCRIPT}] Merge`, { checked: merged.checked, merged: merged.merged.length, llmCalls: merged.llmCalls });
  if (merged.merged.length > 0) await refreshTopicStats(run);

  await printState(options.project, options.kind);
  console.log(`[${SCRIPT}] Done`, { seconds: (Date.now() - started) / 1000 });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
