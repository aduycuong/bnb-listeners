// Sentiment accuracy and aspect F1 of Enrich on a hand-labeled `enrich` sample
// of real mentions (D13/D14). Label the sample on the Mentions page first.
//
// Example:
//   npm run eval:enrich -- -- --project <id>
//   npm run eval:enrich -- -- --project <id> --sample <sampleId>

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { evaluateEnrich } from "@/lib/mentions/services/evaluate-enrich";

const SCRIPT = "evaluate-enrich";

const optionsSchema = z.object({
  project: z.uuid(),
  sample: z.uuid().optional(),
});

function parseArgs() {
  const program = new Command()
    .name(SCRIPT)
    .description("Sentiment accuracy and aspect F1 on a labeled enrich sample.")
    .requiredOption("--project <id>", "Project id")
    .option("--sample <id>", "Sample id (default: latest enrich sample)");
  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

function percent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

async function main() {
  const options = parseArgs();
  const result = await evaluateEnrich({ projectId: options.project, sampleId: options.sample });
  if (!result) {
    console.log(`[${SCRIPT}] No enrich label sample for this project.`);
    return;
  }

  console.log(`[${SCRIPT}] ${result.sampleName}`, { labeled: result.labeled });
  console.log(`[${SCRIPT}] Sentiment accuracy`, percent(result.sentimentAccuracy));
  console.log(`[${SCRIPT}] Confusion (rows = label, columns = Enrich)`);
  console.table(result.confusion);
  console.log(`[${SCRIPT}] Aspects (micro)`, {
    precision: percent(result.aspect.precision),
    recall: percent(result.aspect.recall),
    f1: percent(result.aspect.f1),
  });
  console.table(
    result.byAspect.map((row) => ({
      aspect: row.name,
      support: row.support,
      precision: percent(row.precision),
      recall: percent(row.recall),
      f1: percent(row.f1),
    })),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error);
    process.exit(1);
  });
