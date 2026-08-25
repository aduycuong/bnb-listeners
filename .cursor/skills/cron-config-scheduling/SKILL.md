---
name: cron-config-scheduling
description: Implement recurring jobs from a jsonb cron_config using QStash schedules — trigger syncXSchedule when eligibility changes, scheduleId format, and callback job handlers. Use when adding cron_config scheduling, syncing QStash schedules, or wiring scheduled runs for any entity or task handler.
---

# Cron Config → QStash Schedule

Recurring work is driven by a `cron_config` jsonb column on an entity row. QStash holds the schedule; the callback dispatches to a registered job handler.

## Shared infrastructure (read first)

| Area | Location |
|------|----------|
| Schedule CRUD | `lib/qstash/services/{get,create,delete}-schedule-service.ts` |
| Job registry | `lib/qstash/job-config.ts` → `qstashJobHandlers` |
| Callback route | `app/api/qstash/callback/route.ts` |
| Cron form shape | `lib/common/cron-presets.ts` (`normalizeCronScheduleValue`, `FormFieldCron`) |
| QStash cron string | `lib/qstash/utils/build-qstash-cron.ts` (`buildQstashCron`) |

## `cron_config` shape

Stored on the entity row (jsonb):

```json
{ "cron": "0 9 * * 1", "timezone": "UTC" }
```

- Normalize with `normalizeCronScheduleValue` in forms and services.
- Convert to QStash cron with `buildQstashCron`: `CRON_TZ={timezone} {cron}`.
- Empty/missing `cron` → no schedule.

## QStash services

| Service | Role |
|---------|------|
| `getSchedule({ scheduleId })` | Returns schedule or `null` on 404 |
| `createSchedule({ userId, jobName, payload, cron, scheduleId? })` | Creates schedule; body includes `userId` |
| `deleteSchedule({ scheduleId })` | Deletes schedule; no-op on 404 |

- `createSchedule` takes **`userId` in params** (no session). Server actions inject `userId` from session.
- Callback URL: `getCallbackUrl()` → `/api/qstash/callback`.

## Schedule ID

- Stable, derived from the entity type + record id.
- QStash allows only alphanumeric, hyphen, underscore, period — **no colons**.
- Pattern: `{entity-kebab}-schedule-{recordId}` (e.g. `my-task-schedule-{id}`).
- Add `getXScheduleId(recordId)` in the entity's `lib/{module}/utils/`.

## Eligibility (when to schedule)

Define entity-specific rules. Schedule only when **all** are true:

1. Record exists and belongs to the user/context
2. Any enable/active flags required by the domain
3. Parent/context preconditions (if applicable)
4. `cron_config.cron` is non-empty (after `buildQstashCron`)

Otherwise delete the QStash schedule if it exists.

## Sync flow (per entity)

Add `syncXSchedule` under `lib/{module}/services/`. **Trigger it whenever eligibility may have changed** — the sync service loads current state and creates, updates, or deletes the QStash schedule as needed.

```
1. Load entity (+ parent fields needed for eligibility)
2. scheduleId = getXScheduleId(recordId)
3. qstashCron = buildQstashCron(cron_config)
4. shouldSchedule = eligibility rules
5. existing = getSchedule({ scheduleId })

6. If !shouldSchedule:
     if existing → deleteSchedule
     return

7. If existing && cron + destination match → return (no-op)

8. If existing → deleteSchedule
9. createSchedule({ userId, jobName, payload, cron: qstashCron, scheduleId })
```

- Compare **`cron` and `destination` only** — do not string-compare JSON body.
- Sync failures should fail the mutation (throw `APIError`, e.g. 502).
- On entity **delete**: delete QStash schedule by `scheduleId`, then delete the row.

## When to trigger `syncXSchedule`

Call sync from any code path that can change eligibility — not only entity CRUD. Examples:

| Trigger | Example |
|---------|---------|
| Entity create | `create-tool.ts` → `syncToolSchedule` |
| Entity update | `update-tool.ts` → `syncToolSchedule` (cron, enabled flag, etc.) |
| Entity delete | delete service → `deleteSchedule({ scheduleId })` before removing the row |
| Parent state change | `archive-dataflow.ts` → `syncDataflowToolSchedules` (bulk re-sync children) |
| Admin / migration script | one-off script that toggles flags or backfills schedules |
| Manual repair | admin action or CLI that re-runs sync for a stale schedule |

Prefer a dedicated bulk helper (e.g. `syncParentXSchedules`) when one parent change affects many child schedules.

## Parent / bulk sync

When a parent record affects many children (e.g. archive/disable a container), add `syncParentXSchedules` that lists child ids and calls per-entity sync for each.

## Scheduled run (callback handler)

1. Define a job name constant in `lib/{module}/constants.ts` (e.g. `RUN_MY_TASK_QSTASH_JOB_NAME`).
2. Implement `handleRunMyTaskQstashJob` in `lib/{module}/services/`:
   - Parse payload with a zod schema (minimal ids only, e.g. `{ recordId }`).
   - Load record from DB; re-check eligibility; no-op if ineligible.
   - Run domain work with `runType: "scheduled"` (or equivalent).
3. Register handler in `lib/qstash/job-config.ts` → `qstashJobHandlers`.
4. `createSchedule` body: `{ jobName, payload, userId }` — dispatched by the callback route.

## Checklist for a new `cron_config` entity

- [ ] `cron_config` column on entity table + form field (`FormFieldCron`)
- [ ] `getXScheduleId` util
- [ ] `syncXSchedule` service (flow above)
- [ ] Optional `syncParentXSchedules` for bulk sync when parent affects eligibility
- [ ] Trigger `syncXSchedule` (or bulk sync) from every code path that can change eligibility — e.g. create/update/delete services, parent archive/disable, scripts
- [ ] Job name constant + QStash handler + `job-config` registration

## Env

- `QSTASH_TOKEN`
- `QSTASH_CALLBACK_URL` or `NEXT_PUBLIC_APP_URL` (for callback URL)
