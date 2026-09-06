# Document Groups — Implementation Plan

> **Status:** Draft — review before implementation  
> **Scope:** Single phase (schema → ingest → digest → topic cards UI)  
> **Out of scope:** `topic_digest_rollup` changes (topic cards use daily grain only)

---

## 1. Mục tiêu

Cho phép filter trending topics theo **source group** (vd. Facebook KOL, Tiktoker), trong khi giữ behavior **“Tất cả”** giống hiện tại (metrics trên mọi documents, không lọc group).

**Use cases:**

- “Last 7 days trending — Facebook KOL”
- “Last 7 days trending — Tất cả sources” (như UI hiện tại)

---

## 2. Quyết định đã chốt

| # | Quyết định |
|---|------------|
| 1 | **“Tất cả”** = không filter theo group; metrics gồm mọi documents (behavior hiện tại). Dùng **fixed sentinel UUID** trong digest (không dùng `NULL` trong PK). |
| 2 | **Dedup document** không tính `group_id`. Unique key giữ nguyên: `(workspace_id, doc_type, source_key, source_id)`. |
| 3 | **Đổi group trên job** chỉ áp dụng documents **mới** (insert). Upsert/update không ghi đè `group_id` document đã tồn tại. |
| 4 | **API / MCP create document** cho phép chọn group (optional). |
| 5 | **Không** thêm `group_id` vào `topic_digest_rollup` trong phase này. |
| 6 | Tên bảng: **`source_groups`** (workspace-scoped). |
| 7 | Migration/backfill: documents & digest hiện có → global sentinel. |
| 8 | Triển khai **một phase** (không tách MVP). |
| 9 | `computeDailyMetrics` filter theo `group_id` khi partition ≠ global. |
| 10 | Cập nhật đồng bộ toàn bộ digest pipeline (invalidate, claim, compute, bulk invalidate). |

---

## 3. Mô hình dữ liệu

### 3.1 Constant

```ts
// lib/source-groups/constants.ts
export const ALL_GROUPS_SENTINEL = "00000000-0000-0000-0000-000000000000";
```

- **Không** là row trong bảng `source_groups`.
- Dùng trong `topic_digest_daily.group_id` cho partition **global** (all documents).
- UI filter “Tất cả” query partition này.

### 3.2 Bảng `source_groups`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `workspace_id` | uuid FK → workspaces | ON DELETE CASCADE |
| `name` | text NOT NULL | Unique per workspace |
| `description` | text | Optional |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexes:** `UNIQUE (workspace_id, name)`, `(workspace_id)`.

Drizzle export gợi ý: `sourceGroups` / `SourceGroup`.

### 3.3 Cột `group_id` trên `jobs`

| Column | Type | Notes |
|--------|------|-------|
| `group_id` | uuid NULL | FK → `source_groups.id` ON DELETE SET NULL |

- `NULL` = job không gán source group cho documents mới.
- Edit job đổi `group_id` → chỉ documents **insert mới** qua job đó nhận group mới.

### 3.4 Cột `group_id` trên `documents`

| Column | Type | Notes |
|--------|------|-------|
| `group_id` | uuid NULL | FK → `source_groups.id` ON DELETE SET NULL |

- Set lúc **insert** từ job handler hoặc API/MCP.
- `NULL` = document không thuộc source group cụ thể; vẫn được tính trong partition global.
- **Upsert:** nếu document đã tồn tại → **không** update `group_id` (first wins).

**Index:** `(workspace_id, group_id)` — filter/list documents theo group (future).

### 3.5 `topic_digest_daily` — thêm `group_id`

**PK mới:** `(topic_id, date_key, group_id)`

| `group_id` value | Ý nghĩa metrics |
|------------------|-----------------|
| `ALL_GROUPS_SENTINEL` | Mọi documents (behavior hiện tại) |
| `<source_groups.id>` | Chỉ documents có `documents.group_id = <source_groups.id>` |

**Index mới:** `(group_id, date_key, topic_id)` — topic cards filter theo group.

**Không** sửa `topic_digest_rollup` trong phase này.

---

## 4. Luồng dữ liệu

```mermaid
flowchart TD
  subgraph ingest [Ingest]
    J[Job với group_id?]
    WH[Bright Data webhook]
    API[API / MCP create document]
    J --> WH
    WH --> UD[upsertDocument + group_id on insert]
    API --> CD[createDocument + group_id]
  end

  subgraph classify [Classify]
    CL[classifyDocument]
    CL --> INV1["invalidate (topic, date, ALL_GROUPS_SENTINEL)"]
    CL --> INV2["invalidate (topic, date, doc.group_id) if not null"]
  end

  subgraph digest [Digest pipeline]
    INV1 --> TDD[topic_digest_daily]
    INV2 --> TDD
    TDD --> RC[recompute job]
    RC --> CM[computeDailyMetrics filtered by group_id]
  end

  subgraph ui [Topic cards UI]
    CM --> LC[listTopicCards]
    LC --> ALL["Filter: Tất cả → group_id = sentinel"]
    LC --> GRP["Filter: Source group X → group_id = X"]
  end
```

---

## 5. Digest — invalidate rules

Khi document được gán / bỏ gán topic (`classifyDocument` và mọi path tương lai gán topic):

1. **Luôn** invalidate `(topicId, dateKey, ALL_GROUPS_SENTINEL)`.
2. **Nếu** `document.group_id IS NOT NULL` → thêm invalidate `(topicId, dateKey, document.group_id)`.

`dateKey` = `date(published_at)` như hiện tại; skip nếu `published_at` null.

### 5.1 `computeDailyMetrics`

```ts
// Pseudocode
if (groupId === ALL_GROUPS_SENTINEL) {
  // COUNT documents joined via document_topics — NO filter on documents.group_id
} else {
  // + AND documents.group_id = groupId
}
```

### 5.2 Pipeline files cần sửa

| File | Thay đổi |
|------|----------|
| `lib/topic-digests/services/invalidate-topic-digest.ts` | Thêm param `groupId`; upsert PK 3 cột |
| `lib/classification/services/classify-document.ts` | Pass `groupId` từ document; fan-out invalidate (global + group) |
| `lib/topic-digests/utils/compute-daily-metrics.ts` | Filter theo `groupId` |
| `lib/topic-digests/utils/claim-digest-rows.ts` | Claim/return `(topic_id, date_key, group_id)` |
| `lib/topic-digests/services/recompute-topic-digests.ts` | Pass `groupId` vào compute |
| `lib/topic-digests/utils/reset-stuck-workers.ts` | Không đổi logic (row-level) |
| `lib/topic-digests/services/bulk-invalidate-workspace-digests.ts` | Invalidate **mọi** partition `(topic, date, *)` cho workspace — xem §5.3 |

### 5.3 Bulk taxonomy invalidate

Sau merge/split topics, cần đánh dấu stale **cả** partition global lẫn từng group cho các topics bị ảnh hưởng. Cách đơn giản phase 1:

```sql
UPDATE topic_digest_daily tdd
SET is_stale = true, is_bulk_stale = true, ...
FROM topics t
WHERE tdd.topic_id = t.id
  AND t.workspace_id = $workspaceId;
```

(Không cần filter `group_id` — update all partitions.)

---

## 6. Ingest — jobs & documents

### 6.1 Webhook path

`handleBrightDataJobWebhook` select thêm `jobs.groupId` → truyền vào `upsertDocument`.

### 6.2 `upsertDocument`

Thêm optional `groupId?: string | null` vào params:

| Outcome | `group_id` behavior |
|---------|---------------------|
| **inserted** | Set `groupId` từ job (có thể null) |
| **updated** / **unchanged** | **Không** đổi `group_id` hiện có |

### 6.3 `createDocument` (API / MCP)

- Schema: `groupId: z.string().uuid().optional().nullable()`
- Insert: `group_id: params.groupId ?? null`
- Validate `groupId` thuộc workspace (FK + app check against `source_groups`).

### 6.4 Job create / update

- Schema: `groupId` optional nullable trên create/update job body.
- `createJob` / `updateJob` persist `jobs.group_id`.
- UI: dropdown chọn source group trên job form (`job-menu-form-page.tsx`).

---

## 7. Source groups module (`lib/source-groups/`)

Theo `lib-services` rules:

```
lib/source-groups/
├── constants.ts          # ALL_GROUPS_SENTINEL
├── schema.ts             # Zod: create/update/list
├── types.ts
├── actions.ts            # Server actions (nếu cần UI)
└── services/
    ├── create-source-group.ts
    ├── update-source-group.ts
    ├── delete-source-group.ts
    └── list-source-groups.ts
```

### 7.1 API routes

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/source-groups` | List source groups trong workspace |
| POST | `/api/source-groups` | Tạo source group |
| PATCH | `/api/source-groups/[id]` | Sửa source group |
| DELETE | `/api/source-groups/[id]` | Xóa source group (`ON DELETE SET NULL` trên jobs/documents) |

### 7.2 UI (phase 1)

- **Source groups management page** (hoặc section trong workspace settings): CRUD ~50 groups.
- **Job form:** dropdown source group (optional, “Không chọn group”).
- **Topic list toolbar:** dropdown filter — “Tất cả” | `<source group names>`.
- **Document create form / MCP:** optional source group selector.

---

## 8. Topic cards

### 8.1 API

`GET /api/topics/cards` thêm query param:

```
groupId?: uuid   — omit hoặc ALL_GROUPS_SENTINEL → “Tất cả”
```

Mapping:

| UI | Query |
|----|-------|
| Tất cả | `groupId` absent hoặc `ALL_GROUPS_SENTINEL` |
| Source group X | `groupId=<source_groups.id>` |

### 8.2 `listTopicCards`

Thêm filter:

```sql
AND tdd.group_id = ${resolvedGroupId}::uuid
```

`resolvedGroupId` = param hoặc default `ALL_GROUPS_SENTINEL`.

Sparkline query: cùng filter `group_id`.

### 8.3 Frontend

- `TopicCardsQueryFilters` + `topic-query-keys.ts`: thêm `groupId?`
- `TopicListToolbar`: dropdown source groups (fetch từ `/api/source-groups`)
- `TopicListPage`: pass filter vào fetch + infinite query key

---

## 9. Migration & backfill

> AI chỉ sửa `db/schema.ts` + `.ai/database-schema.md`. User chạy `npm run db:generate` và `npm run db:migrate`.

### 9.1 Schema migration (Drizzle generate)

1. Tạo bảng `source_groups`.
2. Thêm `jobs.group_id`, `documents.group_id` (nullable FK → `source_groups.id`).
3. Thêm `topic_digest_daily.group_id NOT NULL DEFAULT ALL_GROUPS_SENTINEL`.
4. Drop PK cũ `(topic_id, date_key)` → PK mới `(topic_id, date_key, group_id)`.
5. Thêm index `(group_id, date_key, topic_id)`.

### 9.2 Data backfill (SQL thủ công hoặc script sau migrate)

```sql
-- Documents hiện có: giữ group_id NULL (ungrouped)
-- Digest hiện có: gán ALL_GROUPS_SENTINEL (đã là default nếu column added with default)
UPDATE topic_digest_daily SET group_id = '00000000-0000-0000-0000-000000000000'
WHERE group_id IS NULL; -- nếu cần
```

Không recompute ngay — metrics global vẫn đúng vì partition sentinel = toàn bộ documents như trước.

Documents mới có `group_id` → partition group sẽ được populate dần qua invalidate + recompute.

### 9.3 Optional: backfill group partitions

Nếu muốn metrics lịch sử cho từng group ngay sau deploy:

- Script bulk invalidate `(topic_id, date_key, group_id)` cho mọi `(topic, date)` × mỗi `source_groups.id` có documents.
- Chạy bulk drain job — **không bắt buộc** cho go-live.

---

## 10. Edge cases

| Case | Hành vi |
|------|---------|
| Cùng post, 2 job khác group | Dedup → document giữ `group_id` lần insert đầu |
| Document `group_id = NULL` | Tính trong global partition; **không** có row digest riêng cho “null group” |
| Xóa source group | FK `SET NULL` trên jobs/documents; digest rows group cũ orphaned — có thể cleanup script hoặc `ON DELETE CASCADE` digest (quyết định: **giữ rows**, recompute job tự idle) |
| Job `group_id = NULL` | Documents insert với `group_id = NULL` |
| Classify document không có `published_at` | Skip invalidate (như hiện tại) |
| Empty source group | Query trả topics với metrics 0 / null |

---

## 11. Testing checklist

### Unit / integration

- [ ] `computeDailyMetrics` — global vs specific group counts đúng
- [ ] `invalidateTopicDigest` — tạo row đúng PK 3 cột; debounce GREATEST vẫn hoạt động
- [ ] `upsertDocument` — insert set group; update không đổi group
- [ ] `createDocument` — validate group thuộc workspace (`source_groups`)
- [ ] `listTopicCards` — filter global vs group

### Manual QA

- [ ] Tạo 2 source groups, 2 jobs (mỗi job 1 group), scrape → documents có đúng `group_id`
- [ ] Classify → global + group digest stale → recompute → topic cards đúng
- [ ] Filter “Tất cả” khớp metrics trước khi deploy (so sánh sample)
- [ ] Filter từng source group chỉ reflect documents của group đó
- [ ] Edit job đổi group → documents cũ giữ group cũ
- [ ] Dedup: scrape cùng post từ job khác group → `group_id` không đổi

---

## 12. Implementation order

Thứ tự đề xuất để tránh broken state giữa chừng:

| Step | Task |
|------|------|
| 1 | `lib/source-groups/` — constants, schema, types, CRUD services, API routes |
| 2 | `db/schema.ts` — `source_groups`, `jobs.group_id`, `documents.group_id`, `topic_digest_daily.group_id` + indexes |
| 3 | Update `.ai/database-schema.md` → user runs `db:generate` + `db:migrate` |
| 4 | Digest pipeline — invalidate, claim, compute, recompute, bulk invalidate |
| 5 | Ingest — `upsertDocument`, webhook, `createDocument`, MCP schema |
| 6 | Jobs — schema/types/services/UI source group selector |
| 7 | Topics — `listTopicCards`, API query schema, types |
| 8 | UI — source groups management, topic toolbar filter, document form group field |
| 9 | Manual QA theo checklist §11 |

---

## 13. Files dự kiến thay đổi (reference)

### New

- `lib/source-groups/**`
- `app/api/source-groups/route.ts`
- `app/api/source-groups/[id]/route.ts`
- `components/source-groups/**` (hoặc workspace settings subsection)
- `docs/dev/document-groups-plan.md` (this file)

### Modified

- `db/schema.ts`
- `.ai/database-schema.md`
- `lib/topic-digests/**` (invalidate, claim, compute, recompute, bulk invalidate)
- `lib/classification/services/classify-document.ts`
- `lib/documents/**` (schema, types, upsert, create)
- `lib/jobs/**` (schema, types, create, update, get)
- `lib/jobs/services/handle-bright-data-webhook.ts`
- `lib/topics/services/list-topic-cards.ts`
- `lib/topics/types.ts`
- `app/api/topics/cards/route.ts`
- `app/api/documents/route.ts`
- `lib/mcp/build-mcp-server.ts`
- `components/jobs/job-menu-form-page.tsx`
- `components/topics/topic-list-toolbar.tsx`
- `components/topics/topic-list-page.tsx`
- `components/topics/topic-query-keys.ts`

### Not modified (this phase)

- `topic_digest_rollup` schema & rebuild logic
- `lib/topic-digests/utils/rebuild-rollup-periods.ts` (rollup vẫn chạy cho global grain không partition group)

---

## 14. Rủi ro & mitigations

| Rủi ro | Mitigation |
|--------|------------|
| Invalidate fan-out 2× mỗi classify (global + group) | Chấp nhận được; queue 200/15min đủ cho volume hiện tại |
| Group partition chưa backfill → filter group trống lúc đầu | Docs mới + classify populate dần; optional backfill script §9.3 |
| Orphan digest rows sau xóa source group | Low priority cleanup; không ảnh hưởng global |
| PK migration trên bảng digest đang có data | Test migrate trên staging; default sentinel gán cho rows cũ |

---

## 15. Open items (none blocking)

Không còn câu hỏi blocking. Có thể bắt đầu implement theo §12 sau khi review plan này.
