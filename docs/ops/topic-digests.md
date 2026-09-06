# Topic Digests — Operational Notes

Topic digests lưu trend metrics (`doc_count`, `avg_quality_score`, `trend_score`, `trend_rank`) theo topic và thời gian — trả lời câu hỏi *topic nào hot trong kỳ này?*

Có thể xem **tất cả sources** (mặc định) hoặc lọc theo **source group** (Facebook KOL, Tiktoker, …).

---

## Bảng dữ liệu

| Bảng | Vai trò |
|------|---------|
| `source_groups` | Nhóm nguồn trong workspace |
| `dim_dates` | Lịch tĩnh, seed một lần (~10–20 năm) |
| `topic_digest_daily` | Metrics theo ngày — rolling windows, sparkline, custom range ngắn |
| `topic_digest_rollup` | Tổng hợp tuần / tháng / quý / năm — **calendar presets**, group-filtered |

`documents.group_id` và `jobs.group_id` trỏ tới `source_groups` (nullable). Cả `topic_digest_daily` và `topic_digest_rollup` dùng cột `group_id` với ý nghĩa **partition** — xem bên dưới.

---

## Cơ chế hoạt động

```
Document được classify (gán / bỏ gán topic)
    → invalidate daily row(s) cho date(published_at)
    → debounce
    → recompute job tính lại daily metrics (per group_id partition)
    → rollup rebuild cho các (period, group_id) bị ảnh hưởng
    → re-rank trend_rank per (workspace, group_id)
```

**Partition theo source group** — mỗi row daily là `(topic_id, date_key, group_id)`; mỗi row rollup là `(topic_id, period_grain, period_start, group_id)`:

| `group_id` | Ý nghĩa |
|------------|---------|
| `ALL_GROUPS_SENTINEL` (`00000000-…`) | Mọi documents của topic — UI **Tất cả** |
| UUID source group | Chỉ documents có `documents.group_id` trùng UUID đó |

Khi classify một document:

1. Luôn invalidate partition **global** (`ALL_GROUPS_SENTINEL`).
2. Nếu document có `group_id` → thêm invalidate partition group đó.

Rollup **không có stale flag** — rebuild đồng bộ sau mỗi batch daily recompute, chỉ cho các `(grain, period_start, group_id)` có daily thay đổi.

`documents.group_id` gán lúc **insert** (từ job hoặc API). Upsert document cũ **không** đổi group. Đổi group trên job chỉ áp dụng documents mới.

Row digest tạo **on-demand** — không pre-fill toàn bộ lịch sử cho mọi group.

---

## Cấu hình

Hằng số trong `lib/topic-digests/constants.ts`:

| Hằng số | Mặc định | Ý nghĩa |
|---------|----------|---------|
| `DIGEST_DEBOUNCE_MS` | 1 giờ | Chờ sau lần classify cuối trước khi recompute |
| `RECOMPUTE_BATCH_SIZE` | 200 | Rows xử lý mỗi lần chạy recompute job |
| `BULK_DRAIN_BATCH_SIZE` | 50 | Rows mỗi lần chạy bulk drain job |
| `STUCK_WORKER_TIMEOUT_MINUTES` | 30 | Reset row `processing` bị kẹt |
| `DAILY_RECENCY_WEIGHT` | 1.5 | Hệ số `trend_score` grain ngày |

**QStash schedules:** `recompute-topic-digests` (mỗi 15 phút), `bulk-drain-topic-digests` (cùng cron, queue riêng).

**Sentinel global:** `lib/source-groups/constants.ts` → `ALL_GROUPS_SENTINEL`.

### trend_score

```
trend_score = doc_count × avg_quality_score × recency_weight
```

Rollup grain weights:

| grain | weight |
|-------|--------|
| week | 1.2 |
| month | 1.0 |
| quarter | 0.9 |
| year | 0.8 |

---

## Sử dụng

### Topic cards (UI / API) — hybrid read path

Tránh scan hàng trăm daily rows/topic cho calendar periods dài. `listTopicCards` chọn nguồn theo preset:

| Period preset | Nguồn | Filter |
|---------------|-------|--------|
| `last_7_days`, `last_30_days` | `topic_digest_daily` | `group_id` + SUM date range |
| `this_week`, `last_week` | `topic_digest_rollup` | `group_id` + `period_grain='week'` |
| `this_month`, `last_month` | `topic_digest_rollup` | `group_id` + `period_grain='month'` |
| `custom` (≤90 ngày khuyến nghị) | `topic_digest_daily` | `group_id` + SUM date range |

**Sparkline:** luôn `topic_digest_daily`, 7 ngày, filter `group_id`.

```
GET /api/topics/cards?period=last_7_days&sort=trend
GET /api/topics/cards?period=last_7_days&groupId=<source-group-uuid>
GET /api/topics/cards?period=this_month&groupId=<source-group-uuid>
```

| Filter UI | Query digest |
|-----------|--------------|
| Tất cả | `group_id = ALL_GROUPS_SENTINEL` |
| Source group X | `group_id = X` |

### Rollup / ranking dài hạn

Dùng `topic_digest_rollup` với cùng partition `group_id`. `trend_rank` tính **trong từng `(workspace, group_id)`** — ranking tuần/tháng/quý/năm độc lập per group và per “Tất cả”.

---

## Quy mô dữ liệu

**Daily:** rows ≈ topics × days_active × (1 + groups_with_activity). Index `(group_id, date_key, topic_id)` cho read + rollup rebuild.

**Rollup:** rows ≈ topics × 4 grains × periods × (1 + groups). Chỉ tạo khi daily partition tồn tại (on-demand). Index `(group_id, period_grain, period_start, trend_score DESC)` cho calendar topic cards.

**Rebuild:** mỗi recompute batch dedupe `(grain, period_start, group_id)` từ các daily rows vừa compute — không rebuild toàn workspace.

**Bulk taxonomy:** invalidate mọi daily partition → bulk drain recompute → rollup rebuild theo batch. Backlog lớn có thể mất vài giờ; chấp nhận được vì sự kiện hiếm.

---

## Trạng thái stale

Daily: sau invalidate, row có `is_stale = true` và metrics cũ vẫn đọc được cho đến khi recompute xong. API trả `isStale: true` — UI nên báo đang cập nhật.

Rollup: không stale flag; metrics cập nhật ngay sau daily recompute + rollup rebuild trong cùng job run.

Partition group mới có thể chưa có row cho đến lần classify/recompute đầu tiên — filter group đó có thể trống tạm thời.

---

## Bulk taxonomy (merge / split topics)

Restructure taxonomy làm thay đổi hàng loạt `document_topics` → cần recompute digest. Dùng bulk invalidate workspace (đánh dấu `is_bulk_stale = true` trên **mọi** daily partition) và **bulk drain job** riêng.

| Job | Queue | Batch |
|-----|-------|-------|
| Recompute thường | `is_bulk_stale = false` | 200 |
| Bulk drain | `is_bulk_stale = true` | 50 |

Sau mỗi bulk-drain batch: rollup rebuild cho các `(period, group_id)` affected. Backlog lớn drain dần.

---

## Lưu ý vận hành

- **Debounce:** burst classify liên tục trì hoãn recompute — metrics có thể lag tới ~1 giờ sau khi dữ liệu ổn định.
- **Fan-out classify:** mỗi classify invalidate tối đa 2 daily partitions (global + group).
- **Fan-out rollup:** mỗi recompute batch rebuild rollup cho mỗi `(period, group_id)` unique trong batch — dedupe trong memory.
- **Dedup:** cùng post từ hai job khác group → document giữ group lần insert đầu.
- **Document không group** (`group_id` null): vẫn vào partition global; không có partition digest riêng.
- **Xóa source group:** `group_id` trên jobs/documents → null; rows digest/rollup cũ orphaned (cleanup tuỳ chọn).
- **Stuck worker:** recompute job tự reset row `processing` quá 30 phút ở đầu mỗi run.
- **Backfill lịch sử group:** optional script sau deploy — xem `docs/dev/document-groups-plan.md` §9.3.
