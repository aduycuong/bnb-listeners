// Seed the template personas and panels used by the synthetic connector.
// Idempotent by template key: existing personas and panels are left as they are.
//
// Example:
//   npm run synthetic:seed-personas
//   npm run synthetic:seed-personas -- -- --yes

import "dotenv/config";
import { Command } from "commander";
import { commandArgv } from "./script-argv";
import { z } from "zod";

import { seedPersonaTemplates } from "@/lib/personas/services/seed-persona-templates";
import {
  PERSONA_PANEL_TEMPLATES,
  PERSONA_TEMPLATES,
} from "@/lib/personas/persona-templates";

const SCRIPT = "seed-persona-templates";

const optionsSchema = z.object({
  yes: z.boolean(),
});

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Seed template personas and panels for synthetic data.")
    .option("--yes", "Write to the database (default is a preview)", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();

  console.log(`[${SCRIPT}] Starting`, {
    mode: options.yes ? "apply" : "preview",
    personas: PERSONA_TEMPLATES.length,
    panels: PERSONA_PANEL_TEMPLATES.map((panel) => ({
      name: panel.name,
      members: panel.members.length,
    })),
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Preview only — pass --yes to apply.`);
    return;
  }

  const result = await seedPersonaTemplates();
  console.log(`[${SCRIPT}] Done`, {
    personasCreated: result.personasCreated.length,
    personasSkipped: result.personasSkipped.length,
    panelsCreated: result.panelsCreated,
    panelsSkipped: result.panelsSkipped,
  });
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
