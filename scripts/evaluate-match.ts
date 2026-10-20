// Precision/recall of Match on a hand-labeled random sample of real items (D13).
// Label the sample on the project's Mentions page first.
//
// Example:
//   npm run eval:match -- -- --project <id>
//   npm run eval:match -- -- --project <id> --sample <sampleId>

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { evaluateMatch } from "@/lib/mentions/services/evaluate-match";

const SCRIPT = "evaluate-match";

const optionsSchema = z.object({
  project: z.uuid(),
  sample: z.uuid().optional(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Precision/recall of Match on a labeled random sample.")
    .requiredOption("--project <id>", "Project id")
    .option("--sample <id>", "Sample id (default: latest)");
  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

function percent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const options = parseArgs();
  const result = await evaluateMatch({ projectId: options.project, sampleId: options.sample });
  if (!result) {
    console.log(`[${SCRIPT}] No match label sample for this project.`);
    return;
  }

  console.log(`[${SCRIPT}] ${result.sampleName}`, {
    labeled: result.labeled,
    current: result.current,
  });
  if (!result.current) {
    console.log(`[${SCRIPT}] Match ran with another config after sampling; draw a new sample.`);
  }
  console.table(result.strata);
  console.table([
    { metric: "precision", value: percent(result.precision) },
    { metric: "recall (weighted)", value: percent(result.recall) },
    ...result.precisionByMatchType.map((row) => ({
      metric: `precision ${row.matchType} (n=${row.labeled})`,
      value: percent(row.precision),
    })),
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
