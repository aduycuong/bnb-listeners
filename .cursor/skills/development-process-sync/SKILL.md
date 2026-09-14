---
name: development-process-sync
description: >-
  Sync development progress to the Project Timeline report server by comparing
  existing updates with git history, synthesizing code changes into report
  records, and posting via API only after user confirmation. Use when the user
  asks to update the development process, sync timeline, post progress reports,
  or publish dev updates to timeline.ryobui.com.
---

# Development Process Sync

Publish development updates to the [Project Timeline](https://timeline.ryobui.com) server by **reading code changes**, not raw commit messages.

## Config

Read [projects.json](projects.json) in this skill directory.

| Field | Meaning |
|-------|---------|
| `apiBaseUrl` | Timeline API host (production: `https://timeline.ryobui.com`) |
| `apiKey` | Bearer token for POST (user-maintained; required for production writes) |
| `entries[].workspaceKey` | Match against the current workspace folder name (e.g. `bnb-listeners`) |
| `entries[].projectSlug` | Timeline project slug (e.g. `social-listening`) |
| `entries[].gitBranch` | Branch to read history from (default `main`) |

If `apiKey` is empty, stop before any write and ask the user to set it in `projects.json`.

If no entry matches the workspace, stop and ask the user to add one.

## Prerequisites

- `apiKey` set in `projects.json`.
- Git repo with history on the configured branch.
- Network access to `apiBaseUrl`.

## Workflow

```
Sync progress:
- [ ] Step 1: Resolve project config
- [ ] Step 2: Read existing timeline (sync checkpoint)
- [ ] Step 3: User confirms date range to sync
- [ ] Step 4: Collect commits and analyze code changes
- [ ] Step 5: Synthesize report drafts
- [ ] Step 6: Present drafts — wait for user confirmation
- [ ] Step 7: POST confirmed updates
- [ ] Step 8: Verify readback
```

### Step 1: Resolve project config

1. Read [projects.json](projects.json).
2. Match `workspaceKey` to the workspace root folder name.
3. Call `GET {apiBaseUrl}/api/v1/projects` and confirm `projectSlug` exists.
4. If slug missing, stop — do not guess slugs.

### Step 2: Read existing timeline (sync by date)

1. Fetch all updates for the project (paginate if `totalPages` > 1):

```bash
curl -sS "{apiBaseUrl}/api/v1/updates?project={projectSlug}&page=1&pageSize=100"
```

2. Collect every `publishedAt` date already on the timeline.
3. **Sync checkpoint** = latest `publishedAt`, or `null` if empty.
4. Report checkpoint, existing update count, and which dates are already covered.

Do **not** auto-decide the sync range or backfill scope. The user verifies what still needs syncing.

### Step 3: User confirms date range

Ask the user which dates (or range) to sync. Use the checkpoint report as context only.

Examples: “sync from 2026-09-10”, “only 2026-09-14”, “everything after checkpoint”.

If the user already specified a range in their request, confirm it before proceeding.

### Step 4: Collect commits and analyze code changes

For the confirmed range, list **all** commits on the configured branch — no filtering by message type, author, or merge vs non-merge:

```bash
git log {branch} --since="{start}" --until="{end}" --format="%H|%ad|%s" --date=short --reverse
```

For each commit (or batched per day), inspect **actual code changes**:

```bash
git show --stat {hash}
git show {hash} --no-color
git diff {hash}^..{hash}
```

Read changed files when needed to understand behavior, not just file names. Use commit messages as hints only — the report must reflect what the code does.

### Step 5: Synthesize report drafts

**Do not create one record per commit.** Synthesize meaningful report records from the code analysis.

| Rule | Detail |
|------|--------|
| Grouping | Default: **one record per calendar day** in the sync range that has commits and lacks a timeline entry. Merge all that day’s code changes into one cohesive report. |
| Alternative grouping | If the user asks for weekly or single-batch reports, follow their grouping. |
| Language | Vietnamese, product-facing tone (user/operator impact). |
| Source | Summarize from diffs and code — never paste raw commit messages as the summary. |
| Style reference | `c:\apps\tien-do\data\projects\tool-order-task.json` |

| Field | Guidance |
|-------|----------|
| `title` | Short outcome headline, ≤ 120 chars |
| `summary` | 1–3 sentences on what changed and why it matters, ≤ 2000 chars |
| `publishedAt` | Calendar date for the report (`YYYY-MM-DD`) |

Skip dates that already have a timeline update unless the user explicitly asks to replace one (PATCH only on explicit request).

Prepare idempotency keys: `{projectSlug}-{publishedAt}-sync`

### Step 6: Ask for confirmation (required)

**Never POST without explicit user approval.**

Present drafts with evidence:

| Date | Title | Summary (preview) | Commits analyzed | Action |
|------|-------|-------------------|------------------|--------|
| … | … | first ~120 chars… | N commits | POST / skip |

Ask the user to confirm, edit title/summary, or skip records.

If nothing to publish, say so and stop.

### Step 7: POST confirmed updates

Use `apiKey` from `projects.json`:

```bash
curl -sS -X POST "{apiBaseUrl}/api/v1/updates" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Idempotency-Key: {projectSlug}-{publishedAt}-sync" \
  -H "Content-Type: application/json" \
  --data '{
    "projectSlug": "{projectSlug}",
    "title": "...",
    "summary": "...",
    "publishedAt": "YYYY-MM-DD"
  }'
```

- Expect `201` on first create, `200` with `Idempotent-Replayed: true` on safe retry.
- On `409 IDEMPOTENCY_CONFLICT`, stop that record and ask the user.
- On `401` / `405`, report invalid or missing `apiKey` / writes disabled.

### Step 8: Verify readback

Re-fetch `GET /api/v1/updates?project={projectSlug}` and confirm each posted `publishedAt` appears with the expected title.

## Safety rules

1. **Read before write** — checkpoint comes from the API, not local `tien-do` files.
2. **Confirm before write** — no API mutations until the user approves drafts.
3. **User owns sync scope** — report checkpoint; user decides what range to sync.
4. **Synthesize from code** — analyze diffs; do not filter commits or mirror commits 1:1.
5. **Do not guess slugs** — use config + `GET /api/v1/projects`.
6. **Do not PATCH/DELETE** unless the user explicitly asks.
7. Production data is in Vercel Blob; local `tien-do/data/projects/` is dev-only.

## Additional resources

- API details: [reference.md](reference.md)
- Full AI guide: `c:\apps\tien-do\API_FOR_AI.md`
