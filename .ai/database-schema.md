# Database Schema — BNB Listeners

Source: `db/schema.ts` (Drizzle ORM). Migrations are generated into `drizzle/`.

Neon Postgres with `vector` and `pg_trgm` extensions. Multi-tenant: projects are scoped by `workspace_id`. Firebase Auth identifies users; workspace membership controls API access. The legacy collect/score/classify pipeline tables (`documents`, `comments`, `chunks`, `terms`, `data_sources`, …) were dropped, see `docs/decisions.md` D24.

---

## Layers

```text
L0  Raw archive      R2: raw payload of every connector run (real and synthetic)
L1  Raw store        sources · authors · content_items · engagement_snapshots · item_refresh_schedules · collect_runs
                     (+ personas · persona_panels · persona_panel_members for synthetic data)
L2  Project config   projects · project_entities · project_queries · project_aspects · project_sources · project_enrichers · alert_rules
L3  Analysis         mentions · item_labels · label_samples · mention_* · term_dictionary · topics · match_judgments
L4  Aggregates       not built: metrics_hourly / metrics_daily; dashboards read L3 through `lib/metrics/` (D17)
L5  Outputs          alert_rules · alerts; `insights` and `reports` not built
```

Layers depend only on the ones below. L3–L5 can be dropped and recomputed from L1 + L2. L1 is shared across workspaces; L2 and up belong to a project. Metric formulas (engagement, NSS, SoV) live in `lib/metrics/`, not in scattered SQL.

### `origin` (L1 tables and `mentions`)

| Value | Meaning |
| ----- | ------- |
| `connector` | Collected from a real source; has an R2 payload |
| `synthetic` | Written by the synthetic connector (persona + LLM); traced by `collect_run_id` and `metadata.personaId`; has an R2 payload |
| `legacy_import` | Moved from the old `documents` table; no payload, old id kept in `metadata` |

Real and synthetic data may mix and the raw store is shared across workspaces, so every number shown to a customer must filter on `origin`. `origin` is copied to `mentions` so queries need no join.

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

Tenant container for members, projects, and API keys.

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
- ← `projects.workspace_id`
- ← `workspace_api_keys.workspace_id`

A default workspace is created for each user on first sign-in. A new workspace has no projects until one is created.

---

### `projects`

Social listening scope inside a workspace: one brand, campaign, or similar listening case.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| workspace_id | uuid | NO | — | FK → `workspaces.id` ON DELETE CASCADE |
| name | text | NO | — | Display name, unique per workspace |
| description | text | YES | — | Brand or campaign description |
| case | text | NO | `project` | Real estate case id (`docs/decisions.md` D10): `brand`, `project`, `ir`, `launch`, `broker`, `lead`, `rival`, `market`, `policy`, `kol`, `crisis`, `residents`. Only `project`, `market`, `brand` have a real config yet |
| case_version | integer | NO | `1` | Case definition version (`CASE_VERSIONS` in `lib/projects/case-templates.ts`); raised only when the user saves an upgraded config |
| timezone | text | NO | `Asia/Ho_Chi_Minh` | Timezone for buckets and reports |
| config_version | integer | NO | `1` | Bumped on every config change |
| case_config | jsonb | NO | `{}` | Case-specific fields, validated by the case's zod schema in `lib/projects/case-templates.ts` |
| match_signature | text | YES | — | Hash of query ids + versions and sources at the last full Match |
| matched_at | timestamptz | YES | — | Last full Match |
| notification_config | jsonb | NO | `{}` | `{ channels, recipients, reportSchedule }`: default alert delivery and AI report schedule |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes**

- `projects_workspace_name_idx` — UNIQUE on `(workspace_id, name)`
- `projects_workspace_id_idx` — on `workspace_id`

**Relations**

- ← `project_entities.project_id`, `project_queries.project_id`, `project_aspects.project_id`, `project_sources.project_id`, `alert_rules.project_id`

---

### `project_entities`

Brand, project, competitor or area a project listens for.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| role | text | NO | — | `primary`, `competitor`, `product`, `person`, `area` |
| name | text | NO | — | Display name |
| aliases | jsonb | NO | `[]` | Other names (string[]) |
| color | text | YES | — | Chart color |
| sort_order | integer | NO | `0` | Display order |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `project_entities_project_id_idx` on `project_id`

### `project_queries`

Lexical rule that makes a content item a mention. One generated query per entity.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| entity_id | uuid | YES | — | FK → `project_entities.id` ON DELETE CASCADE |
| include | jsonb | NO | `[]` | Any one term must appear (entity name + aliases) |
| with_terms | jsonb | NO | `[]` | When non-empty, at least one must also appear |
| exclude | jsonb | NO | `[]` | None may appear |
| ambiguous | jsonb | NO | `[]` | Include terms that need LLM confirmation when they are the only match |
| proximity | integer | YES | — | Max words between include and with terms; null = anywhere |
| version | integer | NO | `1` | Bumped when terms change; triggers re-matching |
| enabled | boolean | NO | `true` | |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `project_queries_project_id_idx`, `project_queries_entity_id_idx`

### `project_aspects`

Aspects a project measures sentiment on, initialized from the case template.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| key | text | NO | — | Stable slug (template key or derived from name) |
| name | text | NO | — | Display name |
| description | text | NO | `''` | Guidance for the Enrich prompt |
| sort_order | integer | NO | `0` | Display order |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `project_aspects_project_key_idx` — UNIQUE on `(project_id, key)`

### `project_sources`

Sources a project follows (required for Facebook, which has no keyword search).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| source_id | uuid | NO | — | FK → `sources.id` ON DELETE CASCADE |
| created_at | timestamptz | NO | `now()` | |

**Keys:** primary key `(project_id, source_id)`; `project_sources_source_id_idx` on `source_id`

### `mentions`

A content item that matched a project (docs/decisions.md D11). Tier 2 rejections are kept with `is_relevant = false`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| content_item_id | uuid | NO | — | FK → `content_items.id` ON DELETE CASCADE |
| root_item_id | uuid | YES | — | Root post of the thread |
| kind | text | NO | — | Copied from the item for filtering (`post` \| `comment` \| `reply` \| `article` \| `video` \| `listing`) |
| platform | text | NO | — | Copied from the item for filtering |
| source_id | uuid | YES | — | Copied from the item for filtering |
| author_id | uuid | YES | — | Copied from the item for filtering |
| published_at | timestamptz | YES | — | Copied from the item for filtering |
| origin | text | NO | — | Copied from the item for filtering (`connector` \| `synthetic` \| `legacy_import`) |
| matched_query_ids | jsonb | NO | `[]` | Queries that matched |
| matched_entity_ids | jsonb | NO | `[]` | Entities the item is about |
| matched_terms | jsonb | NO | `[]` | Terms found in the text |
| match_type | text | NO | — | `direct`, `context` or `manual` (added by a labeler) |
| match_tier | text | NO | — | `lexical`, `llm` or `user` |
| is_relevant | boolean | NO | — | Effective relevance (the label when there is one); counted in metrics when true |
| auto_is_relevant | boolean | YES | — | Match's own decision; null for manual mentions |
| match_reason | text | YES | — | Tier 2 reason |
| match_signature | text | NO | — | Project signature when written; stale rows are removed after a full match |
| user_corrected | boolean | NO | `false` | Hand-corrected relevance survives re-matching |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `mentions_project_item_idx` UNIQUE `(project_id, content_item_id)`; `mentions_project_published_idx`; `mentions_project_root_idx`; `mentions_content_item_id_idx`

### `item_labels`

Hand label of one item in one project, kept apart from Match output (docs/decisions.md D13).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| content_item_id | uuid | NO | — | FK → `content_items.id` ON DELETE CASCADE |
| is_relevant | boolean | NO | — | Labeler's answer |
| sentiment | text | YES | — | Labeled sentiment; null when not labeled |
| aspect_keys | jsonb | YES | — | Labeled aspect keys; null = not labeled, [] = no aspect |
| sample_id | uuid | YES | — | FK → `label_samples.id` ON DELETE SET NULL; set when labeled in a sample |
| labeled_by | uuid | YES | — | FK → `users.id` ON DELETE SET NULL |
| labeled_at | timestamptz | NO | `now()` | |

**Indexes:** `item_labels_project_item_idx` UNIQUE `(project_id, content_item_id)`; `item_labels_sample_id_idx`

### `label_samples`

Stratified random sample of a project's items to label.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| name | text | NO | — | e.g. `Mẫu 1` |
| kind | text | NO | `match` | `match` (relevance, stratified) or `enrich` (sentiment and aspects of enriched mentions) |
| strata | jsonb | NO | `{}` | `{ relevant, rejected, unmatched }` → `{ population, sampled }` |
| match_signature | text | YES | — | Project match signature when sampled |
| created_by | uuid | YES | — | FK → `users.id` ON DELETE SET NULL |
| created_at | timestamptz | NO | `now()` | |

### `label_sample_items`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| sample_id | uuid | NO | — | FK → `label_samples.id` ON DELETE CASCADE |
| content_item_id | uuid | NO | — | FK → `content_items.id` ON DELETE CASCADE |
| stratum | text | NO | — | `relevant`, `rejected`, `unmatched` (match samples) or `enriched` |
| position | integer | NO | — | Labeling order |

**Keys:** primary key `(sample_id, content_item_id)`; `label_sample_items_sample_position_idx`

### `project_enrichers`

Enrichers a project runs; seeded from the case template (docs/decisions.md D18).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| enricher_key | text | NO | — | Key of `ENRICHER_REGISTRY` |
| enabled | boolean | NO | `true` | |
| config | jsonb | NO | `{}` | Settings of this enricher for this project |
| created_at | timestamptz | NO | `now()` | |
| updated_at | timestamptz | NO | `now()` | |

**Keys:** primary key `(project_id, enricher_key)`

### `mention_enrichments`

State of one enricher for one mention.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| enricher_key | text | NO | — | |
| status | text | NO | — | `pending`, `done`, `failed`, `waiting` |
| signature | text | YES | — | Enricher signature when it ran |
| content_hash | text | YES | — | Item content hash when it ran |
| model | text | YES | — | Model used; null for code stages |
| error | text | YES | — | |
| enriched_at | timestamptz | YES | — | |
| updated_at | timestamptz | NO | `now()` | |

**Keys:** primary key `(mention_id, enricher_key)`; `mention_enrichments_key_status_idx`

### `mention_sentiments`

Enrich's sentiment of a mention. Effective sentiment is the label when there is one.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | Primary key; FK → `mentions.id` ON DELETE CASCADE |
| sentiment | text | NO | — | `positive`, `neutral`, `negative` |
| sentiment_score | real | NO | — | -1 … 1 |
| emotion | text | YES | — | One of six emotions |

### `mention_entities`

Sentiment toward each tracked entity a mention talks about (Enrich).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| entity_id | uuid | NO | — | FK → `project_entities.id` ON DELETE CASCADE |
| sentiment | text | NO | — | |

**Keys:** primary key `(mention_id, entity_id)`; `mention_entities_entity_id_idx`

### `mention_aspects`

Aspects of a mention from Enrich. Labeled aspects live in `item_labels.aspect_keys` and take precedence.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| aspect_id | uuid | NO | — | FK → `project_aspects.id` ON DELETE CASCADE |
| sentiment | text | YES | — | Sentiment toward this aspect |

**Keys:** primary key `(mention_id, aspect_id)`; `mention_aspects_aspect_id_idx`

### `mention_extractions`

Raw per-mention LLM output that is not a configured FK: case fields and stage inputs (`topic_hint`, `terms`).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| schema_key | text | NO | — | Enricher key |
| data | jsonb | NO | — | Validated by the enricher's zod schema |

**Indexes:** `mention_extractions_mention_id_idx`, `mention_extractions_schema_key_idx`

### `mention_terms`

Indexed terms after the `terms_index` stage (`kind`: `keyword`, `place`, `brand`, `org`).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| kind | text | NO | — | |
| term | text | NO | — | Normalized, mapped through the dictionary |
| text | text | NO | — | As the model wrote it |

**Keys:** primary key `(mention_id, kind, term)`; `mention_terms_kind_term_idx`

### `term_dictionary`

Synonyms and hidden terms for `terms_index`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| scope_type | text | NO | — | `workspace` or `project` |
| scope_id | uuid | NO | — | |
| kind | text | NO | — | Same kinds as `mention_terms` |
| canonical | text | NO | — | Normalized canonical term |
| aliases | jsonb | NO | `[]` | Normalized variants |
| hidden | boolean | NO | `false` | Dropped from the index |
| created_at | timestamptz | NO | `now()` | |
| updated_at | timestamptz | NO | `now()` | |

**Indexes:** `term_dictionary_scope_kind_canonical_idx` UNIQUE

### `topics`

A group of mentions of a project (`kind`: `topic`, `buyer_question`, later `argument`).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| kind | text | NO | `topic` | |
| name | text | NO | — | Topic name (LLM, editable) |
| description | text | NO | `''` | One sentence (LLM, editable) |
| aspect_id | uuid | YES | — | FK → `project_aspects.id` ON DELETE SET NULL; dominant aspect when created |
| status | text | NO | `active` | `active`, `hidden` (still receives mentions), `merged` |
| merged_into_id | uuid | YES | — | FK → `topics.id` ON DELETE SET NULL |
| centroid | vector(1536) | YES | — | Mean embedding of the group's relevant mentions |
| mention_count | integer | NO | `0` | Relevant mentions, refreshed after each run |
| attributes | jsonb | NO | `{}` | Kind-specific fields |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `topics_project_kind_status_idx`; `topics_id_kind_idx` UNIQUE `(id, kind)`

### `mention_topics`

The group of a mention, at most one per `kind`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| kind | text | NO | `topic` | Repeats `topics.kind` |
| topic_id | uuid | NO | — | |
| confidence | real | NO | — | 1 when assigned by the LLM |
| created_at | timestamptz | NO | `now()` | |

**Keys:** primary key `(mention_id, kind)`; `mention_topics_topic_id_idx`; FK `(topic_id, kind)` → `topics (id, kind)` ON DELETE CASCADE

### `mention_embeddings`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| mention_id | uuid | NO | — | FK → `mentions.id` ON DELETE CASCADE |
| kind | text | NO | — | `topic_hint` or `buyer_question` |
| model | text | NO | — | e.g. `text-embedding-3-small` |
| text_hash | text | NO | — | Hash of the embedded text |
| embedding | vector(1536) | NO | — | |
| created_at | timestamptz | NO | `now()` | |

**Keys:** primary key `(mention_id, kind)`

### `match_judgments`

Tier 2 cache shared by projects.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| cache_key | text | NO | — | Primary key: sha256 of prompt version, model, entity terms, root and item content hashes |
| is_relevant | boolean | NO | — | |
| reason | text | YES | — | |
| model | text | NO | — | |
| created_at | timestamptz | NO | `now()` | |

### `alert_rules`

Alert rule of a project; `kind` comes from the catalog in `lib/projects/alert-templates.ts` and may repeat. Configured from phase 3; evaluated hourly by `lib/alerts` (email only, D23).

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key (client-generated for new rules) |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| kind | text | NO | — | `volume_growth`, `negative_share`, `viral_post`, `keyword_hit`, `price_deviation`, `buyer_questions_growth` |
| params | jsonb | NO | `{}` | `{ scope, threshold, window, minMentions, keywords }`; `scope` is `{ type: project }`, `{ type: entity, entityId }`, `{ type: aspect, aspectId }` or `{ type: each_role, role }` |
| channels | jsonb | YES | — | Overrides `projects.notification_config.channels`; null = project default |
| enabled | boolean | NO | `true` | |
| sort_order | integer | NO | `0` | Display order |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `alert_rules_project_id_idx` on `project_id`

---

### `alerts`

One firing of an alert rule. The same rule and scope are recorded at most once per bucket.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| project_id | uuid | NO | — | FK → `projects.id` ON DELETE CASCADE |
| rule_id | uuid | NO | — | FK → `alert_rules.id` ON DELETE CASCADE |
| kind | text | NO | — | Copied from the rule |
| level | text | NO | — | `high`, `med` or `low` |
| title | text | NO | — | Short label shown on the Alerts page |
| body | text | NO | — | What happened, including the threshold |
| status | text | NO | `open` | `open` (recorded, email not requested), `emailed`, `email_failed` |
| payload | jsonb | NO | `{}` | Numbers behind the firing (counts, growth, price, keywords) |
| mention_ids | jsonb | NO | `[]` | Up to 8 mention ids |
| dedupe_key | text | NO | — | `project`, an entity or aspect id, or that plus a content item id for a viral post |
| bucket | text | NO | — | Hour, calendar day, 7-day epoch bucket, or `once` |
| window_start | timestamptz | NO | — | Start of the measured window |
| triggered_at | timestamptz | NO | `now()` | When the evaluator recorded the row |
| emailed_at | timestamptz | YES | — | When email was accepted by Resend |
| email_error | text | YES | — | Why email was not sent |

**Indexes:** unique `alerts_rule_bucket_uidx` on `(rule_id, dedupe_key, bucket)`; `alerts_project_triggered_idx` on `(project_id, triggered_at)`

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

## app_settings

Admin overrides of app-wide settings (collection frequency, comment refresh checkpoints, …), one row per settings group. A group without a row uses the defaults in code. Groups, their Zod schemas and defaults are declared in `lib/settings/registry.ts`; edited in `/admin/settings`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| key | text | NO | — | Primary key; settings group (e.g. `collect-tiers`) |
| value | jsonb | NO | — | The whole group; a value that no longer passes the schema falls back to the default |
| updated_by | uuid | YES | — | FK → `users.id` ON DELETE SET NULL |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

---

## Social listening raw store (L1)

Shared across workspaces — no `workspace_id`. `sources`, `authors` and `content_items` carry `origin` (see Layers). Raw connector payloads are archived in payload storage (L0, R2 today) under `raw/{platform}/{connector}/{yyyy}/{mm}/{dd}/{collect_run_id}.json`. Written by `lib/raw-store/` and `lib/connectors/`; legacy modules must not read or write these tables.

### `sources`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| platform | text | NO | — | `facebook` \| `tiktok` \| `youtube` \| `news` \| `forum` \| `classifieds` … |
| source_type | text | NO | — | `page` \| `group` \| `channel` \| `search` \| `site` … (`search`: a TikTok keyword search treated as a source) |
| external_id | text | NO | — | Platform id (Facebook group id / page handle; TikTok channel: numeric account id; TikTok search: `<REGION>:<keyword>`) |
| url | text | YES | — | Canonical URL |
| name | text | YES | — | Display name |
| follower_count | integer | YES | — | Page followers |
| member_count | integer | YES | — | Group members |
| activity_tier | text | NO | `normal` | `hot` \| `normal` \| `low` \| `paused`; collection frequency (intervals in `app_settings` `collect-tiers`) |
| activity_tier_locked | boolean | NO | `false` | Manual tier (set in `/admin/sources/{id}`); post runs skip recomputing it. `paused` is always manual |
| monthly_record_limit | integer | YES | — | Max Bright Data records per calendar month (UTC) across the source's runs; null = unlimited |
| daily_record_limit | integer | YES | — | Max records per day (Asia/Ho_Chi_Minh) across the source's runs, comment runs included; null = unlimited. Soft: runs already started may go over |
| origin | text | NO | `connector` | Data origin |
| metadata | jsonb | NO | `{}` | Platform extras |
| last_collected_at | timestamptz | YES | — | Last successful collect run |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** unique `(platform, external_id)`; btree `origin`.

### `authors`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| platform | text | NO | — | |
| external_id | text | NO | — | Platform user id, or profile URL when no id is available |
| name | text | YES | — | |
| url | text | YES | — | Profile URL |
| avatar_url | text | YES | — | |
| follower_count | integer | YES | — | |
| author_type | text | YES | — | `kol` \| `agency` \| `community` \| `brand` \| `individual` \| `media` |
| persona_id | uuid | YES | — | FK → `personas.id` ON DELETE SET NULL; synthetic authors only |
| origin | text | NO | `connector` | |
| metadata | jsonb | NO | `{}` | |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** unique `(platform, external_id)`; `persona_id`.

### `collect_runs`

One connector run, driven by the `collect-source` Upstash Workflow.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| connector | text | NO | — | `facebook-posts` \| `facebook-post-refresh` \| `facebook-comments` \| `tiktok-posts` \| `tiktok-search` \| `tiktok-post-refresh` \| `tiktok-comments` \| `synthetic-threads` |
| source_id | uuid | YES | — | FK → `sources.id` ON DELETE SET NULL |
| params | jsonb | NO | `{}` | Connector input (`since`, limits, post URL…) |
| status | text | NO | `pending` | `pending` \| `running` \| `success` \| `failed` |
| workflow_run_id | text | YES | — | Upstash Workflow run id |
| external_job_id | text | YES | — | Provider job id (Bright Data snapshot id) |
| payload_key | text | YES | — | Object key of the raw payload in payload storage (R2 today) |
| item_count | integer | YES | — | Items in the raw payload |
| stats | jsonb | YES | — | Normalize counts `{ inserted, updated, skipped }` plus connector stats (post runs: `lateArrivals`, `maxLatenessMinutes`, `schedulesCreated`, `postsToCollect`, `activityTier`, `postsPerDay`; refresh runs: `checked`, `postsToCollect`, `commentRunsPlanned`; comment runs: `expectedMaxRecords`, `posts[] { postExternalId, numComments, collected, replies }`; TikTok runs also `requests`, and per kind `stoppedBy` / `truncated` (channel scan), `pageSizes` / `duplicates` (search), `requested` / `returned` (refresh), `videos[] { videoId, comments, replies, complete }` / `incompleteVideos` (comments)) |
| error | text | YES | — | Failure message |
| started_at | timestamptz | YES | — | Run start time |
| finished_at | timestamptz | YES | — | Run end time |
| created_at | timestamptz | NO | `now()` | Row creation time |

**Indexes:** `(source_id, created_at DESC)`; `status`; `external_job_id`.

### `content_items`

Posts, comments and replies in one table.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| kind | text | NO | — | `post` \| `comment` \| `reply` \| `article` \| `video` \| `listing` |
| platform | text | NO | — | |
| source_id | uuid | YES | — | FK → `sources.id` ON DELETE SET NULL |
| author_id | uuid | YES | — | FK → `authors.id` ON DELETE SET NULL |
| parent_id | uuid | YES | — | FK → `content_items.id` ON DELETE SET NULL (comment → post, reply → comment) |
| root_id | uuid | YES | — | FK → `content_items.id` ON DELETE SET NULL (thread root post) |
| external_id | text | NO | — | Platform item id |
| url | text | YES | — | |
| text | text | NO | `''` | Content text |
| media | jsonb | NO | `[]` | `[{ type: image \| video, url }]`, plus video transcripts `{ type: transcript, url, text, language, source: asr \| creator, rawText?, correction? }` (D21, D22) |
| language | text | YES | — | |
| content_hash | text | NO | — | Hash of the normalized text and transcript; unchanged content keeps downstream analysis cached |
| published_at | timestamptz | YES | — | |
| first_seen_at | timestamptz | NO | `now()` | |
| last_collected_at | timestamptz | NO | `now()` | |
| like_count | integer | NO | `0` | Latest likes / hearts / favorites |
| comment_count | integer | NO | `0` | Latest comments / replies |
| share_count | integer | NO | `0` | Latest shares / retweets / reposts |
| view_count | integer | NO | `0` | Latest views / plays / impressions |
| reactions | jsonb | YES | — | Reaction breakdown `{ like, love, haha, … }` |
| origin | text | NO | `connector` | |
| collect_run_id | uuid | YES | — | FK → `collect_runs.id` ON DELETE SET NULL (last run that wrote the row) |
| metadata | jsonb | NO | `{}` | Platform extras; `legacy_import` keeps the old document/comment id here |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** unique `(platform, external_id)`; `(source_id, published_at DESC)`; `published_at DESC`; `parent_id`; `root_id`; `author_id`; `collect_run_id`; `origin`.

### `engagement_snapshots`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| content_item_id | uuid | NO | — | FK → `content_items.id` ON DELETE CASCADE |
| collect_run_id | uuid | YES | — | FK → `collect_runs.id` ON DELETE SET NULL |
| captured_at | timestamptz | NO | `now()` | |
| like_count | integer | NO | `0` | Likes at `captured_at` |
| comment_count | integer | NO | `0` | Comments at `captured_at` |
| share_count | integer | NO | `0` | Shares at `captured_at` |
| view_count | integer | NO | `0` | Views at `captured_at` |
| reactions | jsonb | YES | — | |

**Indexes:** `(content_item_id, captured_at DESC)`; unique `(content_item_id, collect_run_id)` so a re-run normalize step does not duplicate snapshots.

### `item_refresh_schedules`

Next comment-refresh checkpoint per post (checkpoints are config, e.g. +6h / +24h / +72h after `published_at`). The row is deleted once the post has passed its last checkpoint. See `docs/plan.md`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| content_item_id | uuid | NO | — | Primary key; FK → `content_items.id` ON DELETE CASCADE |
| next_refresh_at | timestamptz | NO | — | When the checkpoint is due |
| checkpoint_hours | integer | NO | — | Checkpoint being waited for, in hours after `published_at` |
| comments_collected_count | integer | YES | — | `num_comments` when comments were last collected; null = never collected |
| comments_collected_at | timestamptz | YES | — | When comments were last collected |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** `next_refresh_at`.

### `personas`

A reusable kind of person or organization that the synthetic connector writes as. See `docs/synthetic-data.md`.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| template_key | text | YES | — | Stable key of a seeded template; null for hand-made or generated personas |
| name | text | NO | — | |
| kind | text | NO | `individual` | `individual` \| `organization` |
| description | text | NO | — | One or two sentences |
| tone | text | NO | `''` | Free-text writing voice |
| concerns | jsonb | NO | `[]` | `string[]` of aspects the persona cares about |
| attributes | jsonb | NO | `{}` | Extra traits, no migration needed |
| version | integer | NO | `1` | |
| source | text | NO | `manual` | `template` \| `manual` \| `llm_generated` |
| review_status | text | NO | `draft` | `draft` \| `approved` |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** unique `template_key` (nulls allowed many times).

### `persona_panels`

A set of personas with weights that stands for one community.

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| id | uuid | NO | `gen_random_uuid()` | Primary key |
| template_key | text | YES | — | Stable key of a seeded template panel |
| name | text | NO | — | |
| description | text | NO | `''` | |
| created_at | timestamptz | NO | `now()` | Row creation time |
| updated_at | timestamptz | NO | `now()` | Auto-updated via Drizzle `$onUpdate` |

**Indexes:** unique `template_key`.

### `persona_panel_members`

| Column | Type | Nullable | Default | Description |
| ------ | ---- | -------- | ------- | ----------- |
| panel_id | uuid | NO | — | FK → `persona_panels.id` ON DELETE CASCADE |
| persona_id | uuid | NO | — | FK → `personas.id` ON DELETE CASCADE |
| weight | real | NO | `1` | Relative share inside the panel; normalized in code |

**Primary key:** `(panel_id, persona_id)`. **Indexes:** `persona_id`.

---

## Triggers & functions (manual)

None.

---

## Drizzle client

- Config: `drizzle.config.ts` (schema `./db/schema.ts`, output `./drizzle`)
- Runtime: `lib/db.ts` using `@neondatabase/serverless` + `drizzle-orm/neon-http`
