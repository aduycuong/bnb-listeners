---
name: job-status-tracking
description: Implement job status tracking using Firebase Realtime Database (RTDB) jobs, including create/update services and the use-job-status-tracking hook. Use when adding realtime job progress UI, updating job statuses from server code, or configuring Firebase RTDB security rules for reading job status.
---

# Job Status Tracking (RTDB)

## What exists in this repo (source of truth)

- **RTDB path**: `jobs/{jobKey}` (see `lib/notification/constants.ts`)
- **Job record shape** (see `lib/notification/types.ts`):
  - `status`: `"pending" | "running" | "succeeded" | "failed"`
  - `payload`: object (non-null, non-array)
  - `error?`: `string | null`
  - `createdAt`, `updatedAt`: epoch ms

## Backend workflow (create, upsert, update)

### Create a job row

- Use `lib/notification/services/create-job-status-tracking.ts`:
  - Validates `jobKey` with `parseRtdbPathKey` (rejects `. # $ [ ] /`, empty, >256 chars).
  - Writes initial row to `jobs/{jobKey}`.
  - Throws if the job already exists.
- Default initial status is `"pending"` unless provided.
- Prefer this when duplicate keys should be treated as an error (e.g. one-shot payment jobs).

### Upsert a job row

- Use `lib/notification/services/upsert-job-status-tracking.ts`:
  - Creates the row when missing; updates `status`, `payload`, `error`, and `updatedAt` when it exists.
  - Preserves `createdAt` on re-run.
  - No-op (returns `null`) if Admin RTDB isn’t configured.
- Use for stable per-entity keys that are reused across runs (e.g. `tool-run:{toolId}`, `dataflow-run:{dataflowId}`).

### Update a job row

- Use `lib/notification/services/update-job-status-tracking.ts`:
  - No-ops if Admin RTDB isn’t configured or the node does not exist.
  - Updates `status`, optional `payload`, and `updatedAt`.
  - Clears `error` when setting `"succeeded"`.
  - Preserves existing `error` unless you explicitly provide `updates.error`.

**Recommended status transitions**

- Create: `"pending"`
- When work starts: `"running"`
- On success: `"succeeded"` (and error becomes `null`)
- On failure: `"failed"` + set `error`

## Frontend workflow (subscribe + render)

- Use `hooks/use-job-status-tracking.ts`:
  - Subscribes with `onValue(ref(db, "jobs/{jobKey}"))`.
  - Returns `{ job, loading, error }`.
  - If RTDB isn’t configured (missing `NEXT_PUBLIC_FIREBASE_DATABASE_URL`), returns `error`.
  - If node doesn’t exist yet (`snap.val() == null`), it returns `job: null`, `loading: false`, `error: null`.

**UI guidance**

- Treat `loading: true` as “connecting/subscribing”.
- Treat `job?.status` as the canonical progress state.
- If `job` is `null` and there’s no error:
  - Default behavior in this repo is “no job yet / not found”; if you want “pending until appears”, make the UI show a waiting state until a timeout or until a terminal status arrives.

## Firebase Realtime Database rules (read job status)

### Target policy (per your selection)

- Allow reads only for signed-in users: **`auth != null`**

### Minimal rules snippet

Apply in Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    "jobs": {
      "$jobKey": {
        ".read": "auth != null",
        ".write": false
      }
    }
  }
}
```

Notes:
- This repo writes jobs from server/admin SDK; RTDB rules typically don’t block Admin writes, but keeping `".write": false` prevents accidental client-side writes.
- If you also use other RTDB paths (e.g. `channel-notifications/*`), keep their rules explicit too; don’t open `"rules": { ".read": true }` globally.

## Security note (important with guessable jobKey)

If `jobKey` is guessable (e.g. `payment:123`), then `auth != null` means **any signed-in user could read any job** if they can guess keys.

Prefer one of:
- **Unguessable keys**: use `uuid/nanoid` job keys and store mapping server-side.
- **Owner-scoped reads**: store an `ownerUid` in the job record, and use rules:
  - `".read": "auth != null && data.child('ownerUid').val() === auth.uid"`

If you choose owner-scoped reads, update the job record type and both create/update flows accordingly.

## Quick checklist when implementing a new job-tracked flow

- [ ] Choose a `jobKey` that is a valid RTDB path segment (no `. # $ [ ] /`).
- [ ] Create or upsert the job row before starting long work (upsert when the same key is reused).
- [ ] Update status at milestones and set `failed` with `error` on exceptions.
- [ ] On the frontend, call `useJobStatusTracking(jobKey)` and render based on `job?.status`.
- [ ] Ensure RTDB rules match your security model (signed-in vs owner-scoped vs public).
