---
name: script-development
description: Develop TypeScript scripts and CLIs for this repo, including argument parsing, usage/help output, validation, logging, and safe destructive behavior. Use when creating or changing files under scripts/, npm script entries that run local scripts, or script argument parsing/help behavior.
---

# Script Development

## Runtime and location

- Put local project scripts in `scripts/` and use kebab-case file names.
- Write scripts in TypeScript and run them with `tsx`.
- Import `dotenv/config` at the top when the script reads environment variables.
- Prefer importing existing project services/helpers over duplicating domain logic in the script.

## CLI arguments

- Use `commander` for new script argument parsing and help output.
- Keep examples in a short header comment at the top of each script.
- Use explicit option names such as `--user-id`, `--email`, `--dry-run`, and `--yes`; avoid ambiguous short flags except for common help behavior.
- Use `.requiredOption()` for truly required inputs and `.option()` with defaults for optional behavior.
- Validate parsed options with `zod` when values need runtime checks, coercion, exclusivity rules, or non-empty string checks.
- Prefer `program.error(message)` or throwing after validation over manually printing custom usage blocks.

## Safety

- Important scripts that mutate database data must support `--dry-run` and `--yes`.
- Default important database-mutating scripts to dry-run behavior when neither `--dry-run` nor `--yes` is provided.
- Reject conflicting safety flags, such as passing both `--dry-run` and `--yes`.
- For non-database scripts, add `--dry-run` only when it meaningfully reduces risk or improves operator confidence.
- Log the target scope before mutating anything, including counts and identifying selectors where available.

## Structure

- Keep scripts shaped as:
  - imports
  - constants/schemas
  - `parseArgs`
  - small helper functions
  - `main`
  - one `main().catch(...)` block that logs and exits with code `1`
- Keep script-specific helpers inside the script file unless they are reused by unrelated modules.
- Use typed option objects; avoid passing raw `process.argv` deeper into business logic.

## Logging

- Prefix operational logs with the script name, such as `[seed-categories]`.
- Print secrets only when the script's purpose is to generate a one-time secret, and make that behavior clear in help text.
- Include enough context in errors for local debugging, but avoid dumping full environment values or credentials.

## Example

```ts
// Example:
//   npx tsx scripts/example-task.ts --email user@example.com --dry-run

import "dotenv/config";
import { Command } from "commander";
import { z } from "zod";

const optionsSchema = z
  .object({
    email: z.string().email(),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((value) => !(value.dryRun && value.yes), {
    message: "Choose one: --dry-run or --yes.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name("example-task")
    .description("Run an example project task.")
    .requiredOption("--email <email>", "User email")
    .option("--dry-run", "Preview changes without writing", false)
    .option("--yes", "Apply changes", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";

  console.log("[example-task] Starting", {
    email: options.email,
    mode,
  });
}

main().catch((error) => {
  console.error("[example-task] Failed", { error });
  process.exit(1);
});
```
