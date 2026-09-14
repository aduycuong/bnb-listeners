# Timeline API reference

Production server: `https://timeline.ryobui.com`

Source repo (local dev / OpenAPI): `c:\apps\tien-do` — see `API_FOR_AI.md` and `http://localhost:8787/api/openapi.json`.

## Auth

- Production writes use `apiKey` from [`timeline-sync.json`](../../../timeline-sync.json) at the repo root (Bearer token).
- Local dev default when testing against `http://localhost:8787`: `local-dev-key`.

`timeline-sync.json` is gitignored. Copy [`timeline-sync.example.json`](../../../timeline-sync.example.json) and set your key locally.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/projects` | No | List valid `projectSlug` values |
| GET | `/api/v1/updates?project=<slug>&page=1&pageSize=100` | No | Read timeline for one project |
| POST | `/api/v1/updates` | Bearer + `Idempotency-Key` | Create update |

## Create payload

```json
{
  "projectSlug": "social-listening",
  "title": "Short Vietnamese title",
  "summary": "1–3 sentences on user-visible impact.",
  "publishedAt": "YYYY-MM-DD"
}
```

Constraints: `title` ≤ 120 chars, `summary` ≤ 2000 chars, `publishedAt` must be a real calendar date.

## Idempotency

Use a stable key per planned post: `{projectSlug}-{publishedAt}-sync`

- First POST → `201 Created`, `Idempotent-Replayed: false`
- Same key + same body retry → `200 OK`, `Idempotent-Replayed: true`
- Same key + different body → `409 IDEMPOTENCY_CONFLICT` (do not overwrite; ask the user)

## Error shape

```json
{ "error": { "code": "...", "message": "...", "details?": [...] } }
```

Common codes: `UNAUTHORIZED`, `WRITES_DISABLED`, `PROJECT_NOT_FOUND`, `VALIDATION_ERROR`, `IDEMPOTENCY_CONFLICT`.

## Project slug allowlist

For this repo, the **only** slug the agent may use is `entries[].projectSlug` from the matched row in [`timeline-sync.json`](../../../timeline-sync.json) (currently `social-listening` for workspace `bnb-listeners`).

Other slugs exist on the server (`tool-order-task`, `chat-agent`, `sale-gen-anh`, …) but are **out of scope** here. Use `GET /api/v1/projects` only to verify the config slug exists — never to pick or switch slugs.

To sync a different project, the user must edit `timeline-sync.json` (or use that project’s workspace config).
