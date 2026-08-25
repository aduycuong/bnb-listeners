# Codex Project Instructions

This repo keeps project-specific agent guidance in the existing Cursor folders:

- Rules: `.cursor/rules/*.mdc`
- Skills: `.cursor/skills/*/SKILL.md`
- Skill index: `.cursor/skills/README.md`

Before making code changes, Codex should read the relevant files from those folders and apply them as project instructions.

## Always Check

- `.cursor/rules/file-naming.mdc`
- `.cursor/rules/lib-services.mdc`
- `.cursor/rules/common-helpers.mdc`
- `.cursor/rules/frontend-stack.mdc` when working on UI or frontend code

## Conditional Rules

- Read `.cursor/rules/form-creation.mdc` before creating or changing forms.
- Read `.cursor/rules/list-items.mdc` before creating or replacing list panels, item browsers, filters, sorting, pagination, or infinite loading.
- Read `.cursor/rules/drizzle-schema-workflow.mdc` before changing database tables, columns, relations, indexes, constraints, Drizzle config, or schema documentation.

## Reference docs

- **`.cursor/rules/*.mdc`** — enforceable policy (schema workflow, lib layout).
- **`.ai/*.md`** — architecture and structure reference; when a rule and an `.ai` doc disagree after a sync pass, follow the rule for policy. Update both when behaviour changes.
- **`docs/features/`** — product and workflow docs (dataflow, tools, secret store).
- **`docs/dev/`** — UI patterns and implementation guides (panels, list components, tool forms).
- **`docs/agent/`** — external REST API guides served at `/docs/*.md`.

See [`docs/README.md`](docs/README.md) and [`.ai/README.md`](.ai/README.md) for the full index.

## Project Skills

Read `.cursor/skills/README.md` to discover available project skills.
Do not duplicate the skill list here; keep `.cursor/skills/README.md` as the single source of truth.

## Rule Priority

Follow these project rules in addition to the active Codex system/developer instructions. If a project rule conflicts with a higher-priority instruction, follow the higher-priority instruction and mention the conflict when it affects the work.
