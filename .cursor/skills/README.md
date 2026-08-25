## Cursor Skills Index

This folder contains **project skills** for Cursor Agents. Each subfolder is one skill and contains a `SKILL.md`.

### Skills

- **`job-status-tracking/`**: Realtime job status tracking via Firebase RTDB (`jobs/{jobKey}`), including backend create/update services and the `use-job-status-tracking` hook. Use when implementing job progress UI, realtime status updates, or RTDB read rules.
- **`script-development/`**: TypeScript script and CLI conventions. Use when creating or changing files under `scripts/`, npm script entries that run local scripts, or script argument parsing/help behavior.
- **`cron-config-scheduling/`**: Recurring jobs from `cron_config` via QStash schedules — sync on create/update/delete, eligibility, scheduleId, and callback handlers. Use when adding cron-based scheduling for any entity or task handler.

### Conventions

- **Add a new skill**: create `your-skill-name/SKILL.md` (kebab-case directory name).
- **Keep skills focused**: prefer multiple small skills over one giant one.
- **If a skill needs deep docs**: add `reference.md` / `examples.md` in the same folder and link from `SKILL.md`.
