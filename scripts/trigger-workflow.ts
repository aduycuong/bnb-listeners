// Trigger an Upstash Workflow run by name.
// Locally, run the QStash dev server first (`npx @upstash/qstash-cli dev`) and
// set QSTASH_URL, QSTASH_TOKEN and the signing keys it prints in .env.
//
// Example:
//   npx tsx scripts/trigger-workflow.ts --name ping
//   npx tsx scripts/trigger-workflow.ts --name ping --body '{"message":"hello"}'
//   npm run workflow:trigger -- --name ping

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

import { WORKFLOW_NAMES } from "@/lib/workflows/constants";
import { triggerWorkflow } from "@/lib/workflows/services/trigger-workflow";
import { getWorkflowUrl } from "@/lib/workflows/utils/get-workflow-url";

const SCRIPT = "trigger-workflow";

const optionsSchema = z.object({
  name: z.enum(WORKFLOW_NAMES),
  body: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) return undefined;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "--body must be valid JSON." });
        return z.NEVER;
      }
    }),
});

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Trigger an Upstash Workflow run.")
    .requiredOption("--name <name>", `Workflow name (${WORKFLOW_NAMES.join(", ")})`)
    .option("--body <json>", "JSON payload for the run");

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();

  console.log(`[${SCRIPT}] Triggering`, {
    name: options.name,
    url: getWorkflowUrl(options.name),
  });

  const { workflowRunId } = await triggerWorkflow({
    name: options.name,
    body: options.body,
  });

  console.log(`[${SCRIPT}] Triggered`, { workflowRunId });
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
