// Run the topic stage for one project without the workflow (docs/decisions.md D15).
// Dry run prints mention counts by topic status and the current topics.
// --reset deletes the project's topics first so they are rebuilt (embeddings are kept).
//
// Example:
//   npx tsx scripts/topics-project.ts --project <id> --dry-run
//   npm run topics:project -- --project <id> --yes
//   npm run topics:project -- --project <id> --reset --yes

import "dotenv/config";
import { Command } from "commander";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { mentions, topics } from "@/db/schema";
import { db } from "@/lib/db";
import { TOPIC_CONFIG } from "@/lib/topics/config";
import { assignTopics } from "@/lib/topics/services/assign-topics";
import { embedTopicHints } from "@/lib/topics/services/embed-topic-hints";
import { mergeSimilarTopics } from "@/lib/topics/services/merge-similar-topics";
import { refreshTopicStats } from "@/lib/topics/services/refresh-topic-stats";
import { resetProjectTopics } from "@/lib/topics/services/reset-project-topics";

const SCRIPT = "topics-project";

const optionsSchema = z
  .object({
    project: z.uuid(),
    reset: z.boolean(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Embed topic hints and put waiting mentions into existing or new topics for one project.")
    .requiredOption("--project <id>", "Project id")
    .option("--reset", "Delete the project's topics first", false)
    .option("--dry-run", "Show the current state", false)
    .option("--yes", "Call the models and write results", false);
  program.parse();
  return optionsSchema.parse(program.opts());
}

async function printState(projectId: string) {
  const [statuses, rows] = await Promise.all([
    db
      .select({ status: mentions.topicStatus, mentions: count() })
      .from(mentions)
      .where(and(eq(mentions.projectId, projectId), eq(mentions.isRelevant, true)))
      .groupBy(mentions.topicStatus),
    db
      .select({ name: topics.name, status: topics.status, mentions: topics.mentionCount })
      .from(topics)
      .where(and(eq(topics.projectId, projectId), ne(topics.status, "merged")))
      .orderBy(desc(topics.mentionCount)),
  ]);
  console.log(`[${SCRIPT}] Relevant mentions by topic status`, Object.fromEntries(
    statuses.map((row) => [row.status, row.mentions]),
  ));
  console.log(`[${SCRIPT}] Topics (${rows.length})`);
  for (const row of rows) {
    console.log(`  ${String(row.mentions).padStart(4)}  ${row.name}${row.status === "hidden" ? " (ẩn)" : ""}`);
  }
}

async function main() {
  const options = parseArgs();
  console.log(`[${SCRIPT}] Config`, TOPIC_CONFIG);

  if (!options.yes) {
    await printState(options.project);
    console.log(`[${SCRIPT}] Dry run: pass --yes to run.`);
    return;
  }

  const started = Date.now();
  if (options.reset) {
    console.log(`[${SCRIPT}] Reset`, await resetProjectTopics({ projectId: options.project }));
  }

  let embedded = 0;
  for (;;) {
    const result = await embedTopicHints({ projectId: options.project });
    embedded += result.embedded;
    if (!result.more) break;
  }
  console.log(`[${SCRIPT}] Embedded`, { embedded });

  for (;;) {
    const result = await assignTopics({ projectId: options.project });
    console.log(`[${SCRIPT}] Assign`, {
      llmCalls: result.llmCalls,
      assigned: result.assigned,
      waiting: result.waiting,
      created: result.created.map((topic) => `${topic.name} (${topic.mentions})`),
    });
    if (!result.more) break;
  }
  await refreshTopicStats({ projectId: options.project });
  const merged = await mergeSimilarTopics({ projectId: options.project });
  console.log(`[${SCRIPT}] Merge`, { checked: merged.checked, merged: merged.merged.length, llmCalls: merged.llmCalls });
  if (merged.merged.length > 0) await refreshTopicStats({ projectId: options.project });

  await printState(options.project);
  console.log(`[${SCRIPT}] Done`, { seconds: (Date.now() - started) / 1000 });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
