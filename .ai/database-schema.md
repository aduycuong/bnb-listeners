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

Used by `workspaces.topic_language`. Language for AI-generated topic names and descriptions when auto-create topics is enabled.

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
| `skipped` | Reserved — not currently written by the pipeline |
| `failed` | Processing error |

### `comment_role`

Used by `comments.role`. Communicative role relative to the parent post.

| Value | Description |
| ----- | ----------- |
| `debate` | Takes a position for/against the post |
| `answer` | Directly answers a question the post asked |
| `info` | Adds facts, experience, or clarification |
| `other` | Noise, jokes, acknowledgements, off-topic |

Null until the comment has been scored.

### `comment_stance`

Used by `comments.stance`. Only meaningful when `role = debate`.

| Value | Description |
| ----- | ----------- |
| `agree` | Supports the post's claim or position |
| `disagree` | Opposes or challenges the post |
| `neutral` | Debate-adjacent but neither agree nor disagree |

Null until scored, and always null when `role` is not `debate`.
### `workspace_task_type`

Used by `workspace_task_runs.task_type`.

| Value | Description |
| ----- | ----------- |
| `reclassify_documents` | Re-run topic classification on selected documents |
| `reprocess_documents` | Re-run full process-document pipeline (score, classify, embed) |
| `re_embed_documents` | Re-chunk and re-embed documents |
| `bulk_merge_topics` | Merge topics and invalidate affected digests |

### `workspace_task_status`

Used by `workspace_task_runs.status`.

| Value | Description |
| ----- | ----------- |
| `pending` | Created, not yet dispatched |
| `running` | Work in progress |
| `success` | Completed without error |
| `failed` | Completed with error |
| `cancelled` | Stopped before completion |

### `system_schedule_run_trigger`

Used by `system_schedule_runs.trigger` and `workspace_task_runs.trigger` (task runs use `manual` \| `api` only).

| Value | Description |
| ----- | ----------- |
| `scheduled` | Fired by QStash cron |
| `manual` | Triggered via script or admin action |

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
| data_collection_scope | text | NO | `tin tức và dữ liệu về bất động sản` | Domain for relevance scoring and LLM prompts |
| auto_create_topics | boolean | NO | `true` | When true, AI may propose new topics for unmatched documents |
| topic_language | text | NO | `auto` | Language for generated topic names/descriptions (`topic_language` enum) |
| topic_criteria | text | NO | `''` | Optional multiline guidelines for new topic proposals |
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
- ← `workspace_task_runs.workspace_id`
- ← `workspace_api_keys.workspace_id`

LLM system prompts (`classify_topics`, `propose_topic`, `score_relevance`) are built in code from the columns above via `lib/llm/utils/build-system-prompt-from-settings.ts`.

A default workspace is created for each user on first sign-in.

---

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
| `discussion` | Companion document rolling up substantive comments on a post — same `source_key`/`source_id` as the parent, different `doc_type` |
| `review` | User or editorial reviews |
| `legal` | Legal documents, terms, contracts, regulations |
| `guide` | How-to guides, tutorials, FAQs |

Individual social comments are **not** stored as documents. They live in the `comments` table and only the substantive ones are rolled into a `discussion` document for retrieval.
**`source_key` conventions:**

- News/blog outlet slug: `vnexpress`, `reuters`, `techcrunch`
- Review platform: `tripadvisor`, `booking`, `google_maps`
- Social/forum: `{platform}:{handle_or_id}` — `reddit:r/travel`, `facebook:pageId`, `tiktok:@user`
- Generic web: registrable domain — `example.com`

---

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
| like_count | integer | NO | `0` | Likes / hearts / favorites / diggs |
| comment_count | integer | NO | `0` | Comments / replies |
| share_count | integer | NO | `0` | Shares / retweets / reposts |
| view_count | integer | NO | `0` | Views / plays / impressions |
| debate_count | integer | NO | `0` | Scored comments with role = debate |
| answer_count | integer | NO | `0` | Scored comments with role = answer |
| info_count | integer | NO | `0` | Scored comments with role = info |
| agree_count | integer | NO | `0` | Debate comments with stance = agree |
| disagree_count | integer | NO | `0` | Debate comments with stance = disagree |
| neutral_count | integer | NO | `0` | Debate comments with stance = neutral |
| job_run_id | uuid | YES | — | FK → `job_runs.id` ON DELETE SET NULL — job run that first created this document |
| job_id | uuid | NO | — | FK → `jobs.id` ON DELETE CASCADE — scrape job that owns this document; set on insert only |
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
| `idx_documents_backfill_scan` | `(workspace_id, published_at, id)` WHERE `published_at IS NOT NULL` | Keyset scan for topic backfill |
| `idx_documents_created_at` | `(created_at DESC)` | Recent-first by ingestion |
| `idx_documents_metadata` | GIN `metadata jsonb_path_ops` | Filter by metadata |
| `idx_documents_status` | `(embedding_status)` WHERE `<> 'chunked'` | Embedding job queue |
| `idx_documents_quality_score` | `(quality_score)` | Filter/sort by quality |
| `idx_documents_job_run_id` | `(job_run_id)` | Documents created by a job run |
| `idx_documents_job_id` | `(job_id)` | Documents by owning job |
| `idx_documents_workspace_job` | `(workspace_id, job_id)` | Filter/list documents by job |
| `idx_documents_engagement` | `(workspace_id, like_count DESC)` | Rank a workspace's posts by popularity |
| `idx_documents_debate` | `(workspace_id, disagree_count DESC, agree_count DESC)` | Rank posts by debate intensity |

Engagement counters are platform-neutral and refreshed on every upsert, including the "unchanged" path where the body did not change — updating them never triggers a re-embed. Platform-specific counters (Facebook reaction breakdowns, TikTok collects, X bookmarks, Instagram saves) stay in `metadata`.

Debate and role tallies are written by `score-document-comments` after batch scoring. Stance tallies (`agree_count` / `disagree_count` / `neutral_count`) only count comments with `role = debate`. A post is "debated" when both `agree_count` and `disagree_count` are greater than zero. Updating these counters never triggers a re-embed.

`job_run_id` and `job_id` are set only when a scrape job first inserts the document; later upserts do not overwrite them. Deleting a job cascades to its documents (and chunks).

**Relations**

- → `job_runs.id` (`job_run_id`)
- → `jobs.id` (`job_id`)
- ← `comments.document_id`

---

### `comments`

Individual social-media comments on a parent post. Kept out of the document pipeline on purpose — short comments must not run through per-row score / classify / embed.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| document_id | uuid | NO | — | FK → `documents.id` ON DELETE CASCADE — parent post |
| source_id | text | NO | — | Platform comment id |
| author_name | text | YES | — | Display name |
| author_id | text | YES | — | Platform author id |
| content | text | NO | — | Comment body |
| like_count | integer | NO | `0` | Likes on the comment |
| published_at | timestamptz | YES | — | When the comment was posted |
| role | text | YES | — | `debate` \| `answer` \| `info` \| `other`; null until scored |
| stance | text | YES | — | `agree` \| `disagree` \| `neutral`; only when role = debate |
| is_substantive | boolean | YES | — | True when worth retrieving; null until scored |
| scored_at | timestamptz | YES | — | When role/stance were last written |
| metadata | jsonb | NO | `{}` | Platform-specific extras |
| created_at | timestamptz | NO | `now()` | Ingestion time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_comments_document_source` | UNIQUE `(document_id, source_id)` | Dedup per parent post |
| `idx_comments_workspace_id` | `(workspace_id)` | Workspace scope |
| `idx_comments_document_id` | `(document_id)` | List comments for a post |
| `idx_comments_role` | `(document_id, role)` | Role tallies / filters |
| `idx_comments_stance` | `(document_id, stance)` | Debate tallies / filters |
| `idx_comments_unscored` | `(document_id)` WHERE `scored_at IS NULL` | Scoring queue |

**Pipeline:** `upsertComments` → QStash `score-document-comments` → rule-based noise filter → LLM batch role+stance scoring (`gpt-4.1-mini`) → update role/stance tallies on the parent → sync companion `discussion` document from substantive comments.

**Relations**

- → `workspaces.id` (`workspace_id`)
- → `documents.id` (`document_id`)

---

### `chunks`

RAG query table. One row per retrievable unit: a text chunk, or a single image or video from the source post. `topic_ids` and the engagement counters are denormalized from other tables (see triggers below).

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
| content_type | text | NO | `text` | `text` \| `image` \| `video` |
| media_url | text | YES | — | Image or video URL for media chunks |
| media_metadata | jsonb | YES | — | Media descriptor (`kind`, `url`, `index`, `count`, embedding model) |
| embedding_multimodal | vector(1024) | YES | — | voyage-multimodal-3.5; media chunks only |
| topic_ids | uuid[] | YES | `{}` | Denormalized topic ids for fast filtering |
| quality_score | real | YES | — | Denormalized from `documents.quality_score` |
| like_count | integer | NO | `0` | Denormalized from `documents.like_count` |
| comment_count | integer | NO | `0` | Denormalized from `documents.comment_count` |
| share_count | integer | NO | `0` | Denormalized from `documents.share_count` |
| view_count | integer | NO | `0` | Denormalized from `documents.view_count` |
| created_at | timestamptz | NO | `now()` | Row creation time |

**Indexes**

- HNSW on `embedding` (`vector_cosine_ops`, m=16, ef_construction=64)
- Partial HNSW on `embedding_multimodal` WHERE NOT NULL
- GIN on `content_tsv`, `topic_ids`, `metadata`
- B-tree on `doc_type`, `content_type`, `published_at`, `document_id`, `quality_score`, `like_count DESC`
- `(doc_type, published_at DESC)` for type + recency queries

Every chunk has a text `embedding`, including media chunks — their content is the source context plus a snippet of the post body. Media chunks additionally carry `embedding_multimodal` from voyage-multimodal-3.5, which embeds the paired text and media URL together.

Engagement counters are seeded on insert and afterwards kept in step by `trg_sync_chunk_engagement` (see triggers below), so refreshed scrape counts never require re-embedding.

Workspace scope is inherited via `document_id` → `documents.workspace_id`.

---

### `topics`

Workspace-scoped subject taxonomy. The LLM classifier can auto-create topics when no existing topic matches a document.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| name | text | NO | — | Display name, unique per workspace |
| description | text | YES | — | Topic description |
| created_by | text | NO | `admin` | `admin` or `llm_classifier` |
| source_document_id | uuid | YES | — | FK → `documents.id` ON DELETE SET NULL — document that triggered auto-creation |
| listening_started_at | timestamptz | NO | `now()` | Earliest date the topic listens for documents; updated when a backfill completes |
| active_backfill_run_id | uuid | YES | — | Points to the in-flight backfill run (application-managed; no FK) |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_topics_workspace_name` | UNIQUE `(workspace_id, name)` | Name unique within workspace |
| `idx_topics_workspace_id` | `(workspace_id)` | List topics in a workspace |
| `idx_topics_source_document` | `(source_document_id)` | Trace auto-created topics |
| `idx_topics_active_backfill_run` | `(active_backfill_run_id)` | Resolve active backfill from topic |

---

### `document_topics`

LLM or admin assignments linking documents to topics.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| document_id | uuid | NO | — | FK → `documents.id` ON DELETE CASCADE |
| topic_id | uuid | NO | — | FK → `topics.id` ON DELETE CASCADE |
| confidence | real | NO | `1` | Assignment confidence (0–1) |
| assigned_by | text | NO | `llm_classifier` | `llm_classifier` \| `admin` \| `admin_merge` \| `topic_backfill` |
| assigned_at | timestamptz | NO | `now()` | Assignment time |

**Primary key:** `(document_id, topic_id)`

**Indexes:** `(topic_id)`, `(document_id)`

Document and topic must belong to the same workspace (enforced by application logic).

---

### `topic_backfill_runs`

Tracks user-triggered backfill jobs that scan older documents and assign matches to a single topic.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| topic_id | uuid | NO | — | FK → `topics.id` ON DELETE CASCADE |
| status | text | NO | `pending` | `pending` \| `running` \| `success` \| `failed` \| `cancelled` |
| new_listening_started_at | timestamptz | NO | — | Target listening start date chosen by the user |
| scan_end_at | timestamptz | NO | — | Snapshot of `topics.created_at` when the run started |
| model | text | NO | — | LLM model id used for evaluation |
| quality_min | real | NO | — | Minimum `documents.quality_score` for eligibility |
| include_already_assigned | boolean | NO | `false` | When true, re-evaluate documents already assigned to this topic |
| confidence_min | real | NO | — | Minimum LLM confidence to create an assignment |
| estimate | jsonb | NO | — | Pre-run estimate: `{ documentCount, inputTokens, outputTokens, costUsd }` |
| result | jsonb | NO | `{}` | Progress: `{ documentsScanned, documentsMatched, inputTokens, outputTokens, costUsd, cursor }` |
| error | text | YES | — | Error message when `status = failed` |
| triggered_by | uuid | YES | — | FK → `users.id` ON DELETE SET NULL |
| started_at | timestamptz | NO | `now()` | Run start time |
| finished_at | timestamptz | YES | — | Run end time |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_topic_backfill_runs_topic_started` | `(topic_id, started_at DESC)` | Run history per topic |
| `idx_topic_backfill_runs_workspace_started` | `(workspace_id, started_at DESC)` | Run history per workspace |
| `idx_topic_backfill_one_active` | UNIQUE `(topic_id)` WHERE `status IN ('pending','running')` | One active backfill per topic |

QStash job `rebuild-topic-batch` processes documents in chained batches (`flowControl` parallelism 1 per topic).

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

Daily-grain fact table. One row per `(topic_id, date_key, job_id)`. **Single source of truth for all digest metrics — no rollup table.** All period presets (rolling windows and calendar presets) query this table directly via SUM aggregation.

Rows are created on-demand when a document from a job is first classified for a topic. Stale rows are queued for recompute in FIFO order by `stale_since`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| topic_id | uuid | NO | — | FK → `topics.id` ON DELETE CASCADE |
| date_key | date | NO | — | FK → `dim_dates.date_key` — day of the document's `published_at` |
| job_id | uuid | NO | — | FK → `jobs.id` ON DELETE CASCADE — partition key. Each row holds metrics for documents from a specific scrape job. |
| doc_count | integer | NO | `0` | Non-duplicate documents with `published_at` on this date |
| avg_quality_score | real | YES | — | Average `quality_score` for those documents |
| trend_score | real | YES | — | `doc_count × avg_quality_score × DAILY_RECENCY_WEIGHT(1.5)` |
| is_stale | boolean | NO | `true` | `true` = metrics need recompute |
| is_bulk_stale | boolean | NO | `false` | `true` when invalidated by a bulk taxonomy op (merge/split). Normal recompute job skips these; a separate low-priority bulk drain job handles them with a smaller `LIMIT`. |
| stale_since | timestamptz | YES | — | Queue position for FIFO recompute (`ORDER BY stale_since ASC`). Set via `COALESCE(stale_since, now())` on invalidate; reset to `now()` when invalidating while `processing = true`; compared to `processing_started_at` at finalize; cleared when row becomes fresh. |
| processing | boolean | NO | `false` | `true` while a worker holds the lease |
| processing_started_at | timestamptz | YES | — | Lease start time; used to detect stuck workers and invalidations during processing |
| computed_at | timestamptz | YES | — | Timestamp of last successful compute |

**Query patterns:**

- **Job-filtered query:** `WHERE job_id = $jobId AND date_key BETWEEN $start AND $end` — uses index `(job_id, date_key, topic_id)`
- **All-jobs query:** `WHERE date_key BETWEEN $start AND $end` (no job filter) — uses index `(date_key, topic_id)`. Aggregates across all jobs.

**Primary key:** `(topic_id, date_key, job_id)`

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_topic_digest_daily_job_date` | `(job_id, date_key, topic_id)` | Rolling-window topic cards + sparkline |
| `idx_topic_digest_daily_date` | `(date_key, topic_id)` | All topics for a given day (ranking) |
| `idx_topic_digest_daily_stale` | `(stale_since)` WHERE `is_stale = true AND is_bulk_stale = false AND processing = false` | Normal recompute job queue (excludes bulk-stale rows) |
| `idx_topic_digest_daily_bulk_stale` | `(stale_since)` WHERE `is_stale = true AND is_bulk_stale = true AND processing = false` | Bulk drain job queue — only rows from taxonomy ops |

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

**Relations**

- ← `documents.job_run_id` — documents first created by this run; set null if the run is deleted

---

## System schedules (QStash)

Global infrastructure cron jobs (not workspace-scoped). QStash holds the schedule; each execution is recorded in `system_schedule_runs`.

Seed rows (application): `system-recompute-topic-digests`, `system-bulk-drain-topic-digests`.

### `system_schedules`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| schedule_id | text | NO | — | Stable QStash schedule id (e.g. `system-recompute-topic-digests`) |
| job_name | text | NO | — | Handler key in `qstashJobHandlers` |
| cron_config | jsonb | NO | `{ "cron": "", "timezone": "UTC" }` | Schedule: `{ cron, timezone }` |
| description | text | YES | — | Human-readable description |
| enabled | boolean | NO | `true` | When false, QStash schedule should be removed |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_system_schedules_schedule_id` | UNIQUE `(schedule_id)` | Upsert QStash schedule by id |
| `idx_system_schedules_job_name` | UNIQUE `(job_name)` | One schedule per handler |
| `idx_system_schedules_enabled` | `(enabled)` | Filter active schedules |

**Relations**

- ← `system_schedule_runs.system_schedule_id`

---

### `system_schedule_runs`

One row per system schedule execution. `workspace_id` is optional — set when logging workspace-partitioned work within a global run.

Uses `job_status` for `status` (`running` \| `success` \| `failed`).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| system_schedule_id | uuid | NO | — | FK → `system_schedules.id` ON DELETE CASCADE |
| workspace_id | uuid | YES | — | FK → `workspaces.id` ON DELETE SET NULL — optional partition scope |
| status | text | NO | `running` | `running` \| `success` \| `failed` |
| trigger | text | NO | `scheduled` | `scheduled` \| `manual` |
| result | jsonb | YES | — | Structured outcome (rows claimed, duration, …) |
| error | text | YES | — | Error message when `status = failed` |
| qstash_message_id | text | YES | — | QStash message id for trace/debug |
| started_at | timestamptz | NO | `now()` | Run start time |
| finished_at | timestamptz | YES | — | Run end time |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_system_schedule_runs_schedule_started` | `(system_schedule_id, started_at DESC)` | Recent runs per schedule |
| `idx_system_schedule_runs_started_at` | `(started_at DESC)` | Recent runs globally |
| `idx_system_schedule_runs_status` | `(status)` | Filter by outcome |
| `idx_system_schedule_runs_workspace_id` | `(workspace_id)` | Runs scoped to a workspace |

---

## Workspace tasks

User-triggered background work (reclassify, re-embed, bulk taxonomy ops). Each action creates one row in `workspace_task_runs`. Not stored in `jobs` — scrape job lineage (`documents.job_id`) is unchanged.

### `workspace_task_runs`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| task_type | text | NO | — | See `workspace_task_type` enum |
| status | text | NO | `pending` | See `workspace_task_status` enum |
| params | jsonb | NO | `{}` | Task scope: `{ documentIds?, jobIds?, topicIds?, filter? }` |
| result | jsonb | YES | — | Progress/outcome: `{ total, processed, succeeded, failed, errors? }` |
| error | text | YES | — | Error message when `status = failed` |
| triggered_by | uuid | YES | — | FK → `users.id` ON DELETE SET NULL |
| trigger | text | NO | `manual` | `manual` \| `api` |
| started_at | timestamptz | NO | `now()` | Run start time |
| finished_at | timestamptz | YES | — | Run end time |

**Indexes**

| Index | Columns | Purpose |
| ----- | ------- | ------- |
| `idx_workspace_task_runs_workspace_started` | `(workspace_id, started_at DESC)` | Task history in workspace |
| `idx_workspace_task_runs_workspace_status` | `(workspace_id, status)` | Active tasks in workspace |
| `idx_workspace_task_runs_task_type_started` | `(task_type, started_at DESC)` | Recent runs by task type |

Realtime progress UI uses Firebase RTDB (`jobs/{workspace-task:{runId}}`); Postgres stores durable history.

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
- `sync_chunk_engagement()` — mirrors `documents.{like,comment,share,view}_count` onto that document's chunks; fires only when one of the four counters actually changes

Apply after migrations if not already present.

---

## Drizzle client

- Config: `drizzle.config.ts` (schema `./db/schema.ts`, output `./drizzle`)
- Runtime: `lib/db.ts` using `@neondatabase/serverless` + `drizzle-orm/neon-http`
