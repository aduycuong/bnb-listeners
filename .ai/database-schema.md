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

### `topic_language`

Used by `workspaces.topic_language`. Language for AI-generated topic names and descriptions.

| Value | Description |
| ----- | ----------- |
| `vietnamese` | Always generate in Vietnamese |
| `english` | Always generate in English |
| `auto` | Match the language of the input document |

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
| topic_scope | text | NO | `tin tức và dữ liệu về bất động sản` | Domain this workspace's topics cover; used in LLM system prompts |
| topic_language | text | NO | `auto` | `vietnamese` \| `english` \| `auto` — language for AI-generated topics |
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
- ← `source_groups.workspace_id`

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

---

### `source_groups`

Workspace-scoped labels for grouping scrape jobs and documents (e.g. Facebook KOL, Tiktoker). Used to filter trending topic metrics.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| name | text | NO | — | Display name, unique per workspace |
| description | text | YES | — | Optional notes |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Unassigned group:** Each workspace may have an auto-created "Unassigned" group whose `id` is derived deterministically via UUID v5 — `uuid5(DNS_NAMESPACE, workspace_id)` — computed by `lib/source-groups/utils/get-unassigned-group-id.ts`. No extra column is needed. The group is created on demand when a group is deleted without a move target. It cannot be deleted. The `isUnassigned` field on `SourceGroupListItem` is derived at the application layer by comparing `id === getUnassignedGroupId(workspace_id)`.

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_source_groups_workspace_name` | UNIQUE `(workspace_id, name)` | One name per workspace |
| `idx_source_groups_workspace_id` | `(workspace_id)` | List groups in a workspace |

**Relations**

- ← `jobs.group_id` ON DELETE RESTRICT (app reassigns before deleting group)
- ← `documents.group_id` ON DELETE RESTRICT (app reassigns before deleting group)
- ← `topic_digest_daily.group_id` ON DELETE CASCADE (digest rows auto-deleted with group)

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
| job_run_id | uuid | YES | — | FK → `job_runs.id` ON DELETE SET NULL — job run that first created this document; null when created manually |
| group_id | uuid | YES | — | FK → `source_groups.id` ON DELETE RESTRICT — set on insert only; upsert does not overwrite. App reassigns to another group before deleting the referenced group. |
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
| `idx_documents_job_run_id` | `(job_run_id)` | Documents created by a job run |
| `idx_documents_workspace_group` | `(workspace_id, group_id)` | Filter/list documents by source group |

Near-duplicate detection is scoped to the same workspace. `job_run_id` and `group_id` are set only when a scrape (or other) job first inserts the document; later upserts do not overwrite them.

**Relations**

- → `job_runs.id` (`job_run_id`)
- → `source_groups.id` (`group_id`)

---

### `chunks`

RAG query table. One row per text chunk with vector embedding. `topic_ids` is denormalized from `document_topics` (see triggers below).

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
| topic_ids | uuid[] | YES | `{}` | Denormalized topic ids for fast filtering |
| quality_score | real | YES | — | Denormalized from `documents.quality_score` |
| created_at | timestamptz | NO | `now()` | Row creation time |

**Indexes**

- HNSW on `embedding` (`vector_cosine_ops`, m=16, ef_construction=64)
- Partial HNSW on `embedding_multimodal` WHERE NOT NULL
- GIN on `content_tsv`, `topic_ids`, `metadata`
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
| name | text | NO | — | Display name, unique per workspace |
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
| `idx_topics_workspace_name` | UNIQUE `(workspace_id, name)` | Name unique within workspace |
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

### `dim_dates`

Static calendar dimension table. Pre-populated for 10–20 years (~3 650–7 300 rows). Never updated after initial seed. Pre-computes period-start anchors so rollup GROUP BY avoids runtime `date_trunc` calls.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| date_key | date | NO | — | Primary key (YYYY-MM-DD) |
| year | integer | NO | — | Calendar year |
| quarter | integer | NO | — | Quarter 1–4 |
| month | integer | NO | — | Month 1–12 |
| week | integer | NO | — | ISO week number 1–53 |
| day_of_week | integer | NO | — | 1 = Mon … 7 = Sun |
| day_of_year | integer | NO | — | 1–366 |
| is_weekend | boolean | NO | — | Sat or Sun |
| week_start | date | NO | — | Monday of the ISO week |
| month_start | date | NO | — | First day of the month |
| quarter_start | date | NO | — | First day of the quarter |
| year_start | date | NO | — | First day of the year |

---

### `topic_digest_daily`

Daily-grain fact table. One row per `(topic_id, date_key, group_id)`. **Single source of truth for all digest metrics — no rollup table.** All period presets (rolling windows and calendar presets) query this table directly via SUM aggregation.

Rows are created on-demand when a document in a group is first classified for a topic. The debounce constant `DIGEST_DEBOUNCE_MS` (default 1 hour) is defined in `lib/topic-digests/constants.ts`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| topic_id | uuid | NO | — | FK → `topics.id` ON DELETE CASCADE |
| date_key | date | NO | — | FK → `dim_dates.date_key` — day of the document's `published_at` |
| group_id | uuid | NO | — | FK → `source_groups.id` ON DELETE CASCADE — partition key. Each row holds metrics for documents in a specific group. |
| doc_count | integer | NO | `0` | Non-duplicate documents with `published_at` on this date |
| avg_quality_score | real | YES | — | Average `quality_score` for those documents |
| trend_score | real | YES | — | `doc_count × avg_quality_score × DAILY_RECENCY_WEIGHT(1.5)` |
| is_stale | boolean | NO | `true` | `true` = metrics need recompute |
| is_bulk_stale | boolean | NO | `false` | `true` when invalidated by a bulk taxonomy op (merge/split). Normal recompute job skips these; a separate low-priority bulk drain job handles them with a smaller `LIMIT`. |
| recompute_after | timestamptz | YES | — | Debounce gate: job only picks up when `<= now()` |
| processing | boolean | NO | `false` | `true` while a worker holds the lease |
| processing_started_at | timestamptz | YES | — | Lease start time; used to detect stuck workers |
| computed_at | timestamptz | YES | — | Timestamp of last successful compute |

**Query patterns:**

- **Group-filtered query:** `WHERE group_id = $groupId AND date_key BETWEEN $start AND $end` — uses index `(group_id, date_key, topic_id)`
- **All-groups query:** `WHERE date_key BETWEEN $start AND $end` (no group filter) — uses index `(date_key, topic_id)`. Aggregates across all groups; correct because each document belongs to exactly one group.

**Primary key:** `(topic_id, date_key, group_id)`

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_topic_digest_daily_group_date` | `(group_id, date_key, topic_id)` | Rolling-window topic cards + sparkline |
| `idx_topic_digest_daily_date` | `(date_key, topic_id)` | All topics for a given day (ranking) |
| `idx_topic_digest_daily_stale` | `(recompute_after)` WHERE `is_stale = true AND is_bulk_stale = false AND processing = false` | Normal recompute job queue (excludes bulk-stale rows) |
| `idx_topic_digest_daily_bulk_stale` | `(recompute_after)` WHERE `is_stale = true AND is_bulk_stale = true AND processing = false` | Bulk drain job queue — only rows from taxonomy ops |

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
| group_id | uuid | YES | — | FK → `source_groups.id` ON DELETE RESTRICT — assigned to new documents from this job. App reassigns before deleting the referenced group. |
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

**Relations**

- ← `documents.job_run_id` — documents first created by this run; set null if the run is deleted

---

## workspace_api_keys

Stores metadata for workspace API keys managed via Unkey. The actual key value is held by Unkey; only the display prefix and Unkey key ID are stored here.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | default random |
| `workspace_id` | uuid FK → workspaces | cascade delete |
| `unkey_key_id` | text NOT NULL UNIQUE | Unkey internal key ID |
| `name` | text NOT NULL | human-readable label |
| `key_start` | text NOT NULL | first ~12 chars of key for display (e.g. `bnb_xxxx...`) |
| `created_at` | timestamptz | |

**Indexes:** btree on `workspace_id`; unique on `unkey_key_id`.

**Relations:**
- `workspace_id` → `workspaces.id` (cascade delete)

---

## Triggers & functions (manual)

Not represented in Drizzle schema. Reference SQL in `db/manual/triggers.sql`:

- `sync_chunk_topics()` — keeps `chunks.topic_ids` in sync when `document_topics` changes

Apply after migrations if not already present.

---

## Drizzle client

- Config: `drizzle.config.ts` (schema `./db/schema.ts`, output `./drizzle`)
- Runtime: `lib/db.ts` using `@neondatabase/serverless` + `drizzle-orm/neon-http`
