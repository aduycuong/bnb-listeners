# Database Schema — BNB Listeners

Source: `db/schema.ts` (Drizzle ORM). Migrations are generated into `drizzle/`.

Neon Postgres with `vector` and `pg_trgm` extensions. Multi-tenant: documents and topics are scoped by `workspace_id`. Firebase Auth identifies users; workspace membership controls API and MCP access.

---

## Extensions (manual)

Apply before or alongside the first migration (`db/manual/extensions.sql`):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## Enums (application-level)

### `workspace_permission`

Used by `workspace_members.permission`.

| Value | Description |
| ----- | ----------- |
| `read` | View-only |
| `edit` | Can modify workspace resources |
| `owner` | Full control |

### `embedding_status`

Used by `documents.embedding_status`.

| Value | Description |
| ----- | ----------- |
| `pending` | Awaiting chunking/embedding |
| `chunked` | Chunks stored and indexed |
| `skipped` | Near-duplicate or below quality threshold — no chunks written |
| `failed` | Processing error |

---

## Auth & workspace

### `users`

App user identity, linked to Firebase Auth.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| firebase_uid | text | NO | — | Firebase Auth UID |
| email | text | NO | — | Login / contact email |
| display_name | text | YES | — | Human-readable name |
| avatar_url | text | YES | — | Profile image URL |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Last update time |

**Indexes**

- `firebase_uid` — UNIQUE
- `users_email_idx` — UNIQUE on `email`

**Relations**

- → `workspaces.owner_user_id`
- → `workspace_members.user_id`
- → `workspace_members.granted_by`

---

### `workspaces`

Tenant container for documents, topics, and members.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| name | text | NO | — | Display name |
| slug | text | YES | — | URL-safe identifier |
| owner_user_id | uuid | NO | — | Owning user (`users.id`) |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Last update time |

**Indexes**

- `workspaces_slug_idx` — UNIQUE on `slug`
- `workspaces_owner_user_id_idx` — on `owner_user_id`

**Relations**

- ← `workspace_members.workspace_id`
- ← `documents.workspace_id`
- ← `topics.workspace_id`
- ← `jobs.workspace_id`

A default workspace is created for each user on first sign-in.

---

### `workspace_members`

Membership and permission for a user within a workspace.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| workspace_id | uuid | NO | — | FK → `workspaces.id` |
| user_id | uuid | NO | — | FK → `users.id` |
| permission | text | NO | — | `read` \| `edit` \| `owner` |
| granted_by | uuid | NO | — | FK → `users.id` |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Last update time |

**Primary key:** `(workspace_id, user_id)`

**Indexes**

- `workspace_members_user_id_idx` — on `user_id`

---

## Document pipeline

### Source model

Each ingested item is identified at three levels (all required):

| Level | Column | Purpose | Examples |
| ----- | ------ | ------- | -------- |
| Content type | `doc_type` | What kind of content the item is | `news`, `post`, `review`, `legal`, `comment`, `guide`, … |
| Instance | `source_key` + `source_name` | Which platform/source the item came from | `techcrunch`, `tripadvisor`, `reddit:r/travel`, `facebook:pageId` |
| Item | `source_id` | External item id from the source (dedup) | Platform post id, article id — **not** a URL |

`doc_type` describes the **nature of the content**, not the platform. The same `doc_type` (e.g. `review`) can appear from many platforms, each with its own `source_key`.

Dedup is scoped per workspace: unique `(workspace_id, doc_type, source_key, source_id)`. URLs and other canonical links belong in `metadata` (e.g. `metadata.url`).

**`doc_type` values (open set):**

| Value | Description |
| ----- | ----------- |
| `news` | News articles and press releases |
| `post` | Social media posts, forum threads, blog entries |
| `review` | User or editorial reviews |
| `legal` | Legal documents, terms, contracts, regulations |
| `comment` | Comments or replies on other content |
| `guide` | How-to guides, tutorials, FAQs |

**`source_key` conventions:**

- News/blog outlet slug: `vnexpress`, `reuters`, `techcrunch`
- Review platform: `tripadvisor`, `booking`, `google_maps`
- Social/forum: `{platform}:{handle_or_id}` — `reddit:r/travel`, `facebook:pageId`, `tiktok:@user`
- Generic web: registrable domain — `example.com`

---

### `documents`

One row per ingested item within a workspace. Topic assignment is in `document_topics`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| doc_type | text | NO | — | Content type |
| source_key | text | NO | — | Stable platform/source id |
| source_name | text | NO | — | Human-readable source label |
| source_id | text | NO | — | External item id (not a URL) |
| title | text | YES | — | Human-readable title |
| raw_content | text | NO | — | Full raw text |
| metadata | jsonb | NO | `{}` | Type-specific fields (url, author, …) |
| embedding_status | text | NO | `pending` | `pending` \| `chunked` \| `skipped` \| `failed` |
| quality_score | real | YES | — | Weighted average of scoring dimensions (0–1). Null until scored. |
| is_duplicate | boolean | NO | `false` | True when near-duplicate of another document |
| canonical_id | uuid | YES | — | FK → `documents.id` — original when `is_duplicate` is true |
| published_at | timestamptz | YES | — | Source publish date; used for freshness scoring and canonical ordering |
| created_at | timestamptz | NO | `now()` | Ingestion time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_documents_workspace_source` | UNIQUE `(workspace_id, doc_type, source_key, source_id)` | Per-workspace dedup |
| `idx_documents_workspace_id` | `(workspace_id)` | List documents in a workspace |
| `idx_documents_doc_type` | `(doc_type)` | Filter by content type |
| `idx_documents_source_key` | `(doc_type, source_key)` | List items from one source |
| `idx_documents_published_at` | `(published_at DESC)` | Sort/filter by publish date |
| `idx_documents_created_at` | `(created_at DESC)` | Recent-first by ingestion |
| `idx_documents_metadata` | GIN `metadata jsonb_path_ops` | Filter by metadata |
| `idx_documents_status` | `(embedding_status)` WHERE `<> 'chunked'` | Embedding job queue |
| `idx_documents_quality_score` | `(quality_score)` | Filter/sort by quality |
| `idx_documents_is_duplicate` | `(is_duplicate)` | Exclude duplicates from aggregates |

Near-duplicate detection is scoped to the same workspace.

---

### `chunks`

RAG query table. One row per text chunk with vector embedding. `topic_slugs` is denormalized from `document_topics` (see triggers below).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| document_id | uuid | NO | — | FK → `documents.id` ON DELETE CASCADE |
| chunk_index | integer | NO | — | Order within document |
| content | text | NO | — | Chunk text |
| embedding | vector(1536) | NO | — | text-embedding-3-small |
| doc_type | text | NO | — | Denormalized from document |
| published_at | timestamptz | YES | — | Denormalized from document |
| metadata | jsonb | NO | `{}` | Chunk-level metadata |
| content_tsv | tsvector | NO | generated | `to_tsvector('simple', content)` |
| embedding_model | text | NO | `text-embedding-3-small` | Model used |
| embedding_version | text | NO | `v1` | Embedding version tag |
| content_type | text | NO | `text` | `text` \| `image_caption` \| `image_native` |
| media_url | text | YES | — | Optional media reference |
| media_metadata | jsonb | YES | — | Optional media metadata |
| embedding_multimodal | vector(1024) | YES | — | Optional multimodal embedding |
| topic_slugs | text[] | YES | `{}` | Denormalized topic slugs for fast filtering |
| quality_score | real | YES | — | Denormalized from `documents.quality_score` |
| created_at | timestamptz | NO | `now()` | Row creation time |

**Indexes**

- HNSW on `embedding` (`vector_cosine_ops`, m=16, ef_construction=64)
- Partial HNSW on `embedding_multimodal` WHERE NOT NULL
- GIN on `content_tsv`, `topic_slugs`, `metadata`
- B-tree on `doc_type`, `content_type`, `published_at`, `document_id`, `quality_score`
- `(doc_type, published_at DESC)` for type + recency queries

Workspace scope is inherited via `document_id` → `documents.workspace_id`.

---

### `topics`

Workspace-scoped subject taxonomy. Optional hierarchy via `parent_id`. The LLM classifier can auto-create topics when no existing topic matches a document.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| slug | text | NO | — | URL-safe identifier, unique per workspace |
| name | text | NO | — | Display name |
| parent_id | uuid | YES | — | FK → `topics.id` — optional parent |
| description | text | YES | — | Topic description |
| verified | boolean | NO | `false` | Admin sets `true` after review |
| created_by | text | NO | `admin` | `admin` or `llm_classifier` |
| source_document_id | uuid | YES | — | FK → `documents.id` ON DELETE SET NULL — document that triggered auto-creation |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_topics_workspace_slug` | UNIQUE `(workspace_id, slug)` | Slug unique within workspace |
| `idx_topics_workspace_id` | `(workspace_id)` | List topics in a workspace |
| `idx_topics_parent` | `(parent_id)` | Hierarchy queries |
| `idx_topics_verified` | `(verified)` | Filter unverified LLM topics |
| `idx_topics_source_document` | `(source_document_id)` | Trace auto-created topics |

---

### `document_topics`

LLM or admin assignments linking documents to topics.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| document_id | uuid | NO | — | FK → `documents.id` ON DELETE CASCADE |
| topic_id | uuid | NO | — | FK → `topics.id` ON DELETE CASCADE |
| confidence | real | NO | `1` | Assignment confidence (0–1) |
| assigned_by | text | NO | `llm_classifier` | Who assigned the topic |
| assigned_at | timestamptz | NO | `now()` | Assignment time |

**Primary key:** `(document_id, topic_id)`

**Indexes:** `(topic_id)`, `(document_id)`

Document and topic must belong to the same workspace (enforced by application logic).

---

### `topic_digests`

Precomputed LLM summaries and trend metrics per topic and time period.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| topic_id | uuid | NO | — | FK → `topics.id` ON DELETE CASCADE |
| period_start | timestamptz | NO | — | Period start |
| period_end | timestamptz | NO | — | Period end |
| summary | text | YES | — | LLM-generated summary |
| source_chunk_ids | uuid[] | YES | — | Chunks used for the summary |
| generated_at | timestamptz | YES | — | When summary was generated |
| doc_count | integer | YES | — | Non-duplicate documents in period |
| avg_quality_score | real | YES | — | Average `quality_score` in period |
| trend_score | real | YES | — | `doc_count × avg_quality_score × recency_weight` |
| trend_rank | integer | YES | — | Rank within period (1 = hottest) |
| updated_at | timestamptz | NO | `now()` | Last update time |

**Indexes:** `(topic_id, period_end DESC)`, `(period_start, trend_score)`

---

## Scheduled jobs (QStash)

Recurring scrape/ingest tasks are defined per workspace. QStash holds the schedule; each execution is recorded in `job_runs`.

### `job_status`

Used by `job_runs.status`.

| Value | Description |
| ----- | ----------- |
| `running` | Run started, not yet finished |
| `success` | Completed without error |
| `failed` | Completed with error |

### `jobs`

Workspace-scoped job definition for QStash scheduling.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| name | text | NO | — | Human-readable name, unique per workspace |
| job_type | text | NO | — | Handler key (maps to `qstashJobHandlers` / scrape type) |
| cron_config | jsonb | NO | `{ "cron": "", "timezone": "UTC" }` | Schedule: `{ cron, timezone }` — empty `cron` means no schedule |
| enabled | boolean | NO | `true` | When false, QStash schedule should be removed |
| params | jsonb | NO | `{}` | Type-specific config (source, doc_type, scrape targets, …) |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_jobs_workspace_name` | UNIQUE `(workspace_id, name)` | One name per workspace |
| `idx_jobs_workspace_id` | `(workspace_id)` | List jobs in a workspace |
| `idx_jobs_enabled` | `(enabled)` | Filter active jobs |
| `idx_jobs_job_type` | `(job_type)` | Filter by handler/scrape type |

**Relations**

- ← `job_runs.job_id`

QStash schedule id pattern (application): `job-schedule-{id}`.

---

### `job_runs`

One row per job execution — success/failure, result payload, and error message.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| job_id | uuid | NO | — | FK → `jobs.id` ON DELETE CASCADE |
| status | text | NO | `running` | `running` \| `success` \| `failed` |
| result | jsonb | YES | — | Structured outcome (counts, ids, …) |
| error | text | YES | — | Error message when `status = failed` |
| started_at | timestamptz | NO | `now()` | Run start time |
| finished_at | timestamptz | YES | — | Run end time |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_job_runs_job_id` | `(job_id)` | Runs for a job |
| `idx_job_runs_started_at` | `(started_at DESC)` | Recent runs globally |
| `idx_job_runs_status` | `(status)` | Filter by outcome |
| `idx_job_runs_job_started` | `(job_id, started_at DESC)` | Recent runs per job |

---

## Triggers & functions (manual)

Not represented in Drizzle schema. Reference SQL in `db/manual/triggers.sql`:

- `sync_chunk_topics()` — keeps `chunks.topic_slugs` in sync when `document_topics` changes

Apply after migrations if not already present.

---

## Drizzle client

- Config: `drizzle.config.ts` (schema `./db/schema.ts`, output `./drizzle`)
- Runtime: `lib/db.ts` using `@neondatabase/serverless` + `drizzle-orm/neon-http`
