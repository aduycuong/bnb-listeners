# Topic Digests — Operational Notes

Topic digests lưu trend metrics (`doc_count`, `avg_quality_score`, `trend_score`, `trend_rank`) theo topic và thời gian — trả lời câu hỏi *topic nào hot trong kỳ này?*

Có thể xem **tất cả sources** (mặc định) hoặc lọc theo **source group** (Facebook KOL, Tiktoker, …).

---

## Bảng dữ liệu

| Bảng | Vai trò |
|------|---------|
| `source_groups` | Nhóm nguồn trong workspace |
| `dim_dates` | Lịch tĩnh, seed một lần (~10–20 năm) |
| `topic_digest_daily` | Metrics theo ngày — nguồn chính cho topic cards |
| `topic_digest_rollup` | Tổng hợp tuần / tháng / quý / năm — workspace-wide, chưa filter theo group |

`documents.group_id` và `jobs.group_id` trỏ tới `source_groups` (nullable). Digest daily dùng cột `group_id` riêng với ý nghĩa partition — xem bên dưới.

---

## Cơ chế hoạt động

```
Document được classify (gán / bỏ gán topic)
    → invalidate daily row(s) cho date(published_at)
    → debounce
    → recompute job tính lại metrics
    → (tuỳ chọn) rollup + re-rank
```

**Partition theo source group** — mỗi row daily là `(topic_id, date_key, group_id)`:

| `group_id` | Ý nghĩa |
|------------|---------|
| `ALL_GROUPS_SENTINEL` (`00000000-…`) | Mọi documents của topic — UI **Tất cả** |
| UUID source group | Chỉ documents có `documents.group_id` trùng UUID đó |

Khi classify một document:

1. Luôn invalidate partition **global** (`ALL_GROUPS_SENTINEL`).
2. Nếu document có `group_id` → thêm invalidate partition group đó.

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

Rollup grain (chỉ `topic_digest_rollup`, workspace-wide):

| grain | weight |
|-------|--------|
| week | 1.2 |
| month | 1.0 |
| quarter | 0.9 |
| year | 0.8 |

---

## Sử dụng

### Topic cards (UI / API)

Đọc `topic_digest_daily`, SUM trong khoảng ngày (`last_7_days`, `this_month`, custom, …).

```
GET /api/topics/cards?period=last_7_days&sort=trend
GET /api/topics/cards?period=last_7_days&groupId=<source-group-uuid>
```

| Filter UI | Query digest |
|-----------|--------------|
| Tất cả | `group_id = ALL_GROUPS_SENTINEL` |
| Source group X | `group_id = X` |

Rollup **không** dùng cho topic cards có filter group.

### Rollup / ranking dài hạn

Dùng `topic_digest_rollup` — aggregate từ daily partition global only. Phù hợp ranking tuần/tháng/quý/năm toàn workspace, chưa theo source group.

---

## Trạng thái stale

Sau invalidate, row có `is_stale = true` và metrics cũ vẫn đọc được cho đến khi recompute xong. API trả `isStale: true` — UI nên báo đang cập nhật, không ẩn data.

Partition group mới có thể chưa có row cho đến lần classify/recompute đầu tiên — filter group đó có thể trống tạm thời.

---

## Bulk taxonomy (merge / split topics)

Restructure taxonomy làm thay đổi hàng loạt `document_topics` → cần recompute digest. Dùng bulk invalidate workspace (đánh dấu `is_bulk_stale = true` trên mọi partition của workspace) và **bulk drain job** riêng để không nghẽn queue recompute hàng ngày.

| Job | Queue | Batch |
|-----|-------|-------|
| Recompute thường | `is_bulk_stale = false` | 200 |
| Bulk drain | `is_bulk_stale = true` | 50 |

Backlog lớn drain dần (~vài giờ với hàng nghìn rows) — chấp nhận được vì sự kiện hiếm.

---

## Lưu ý vận hành

- **Debounce:** burst classify liên tục trì hoãn recompute — metrics có thể lag tới ~1 giờ sau khi dữ liệu ổn định.
- **Fan-out:** mỗi classify invalidate tối đa 2 partitions (global + group) — queue dài hơn so với không có source groups.
- **Dedup:** cùng post từ hai job khác group → document giữ group lần insert đầu.
- **Document không group** (`group_id` null): vẫn vào partition global; không có partition digest riêng.
- **Xóa source group:** `group_id` trên jobs/documents → null; rows digest cũ có thể orphaned (cleanup tuỳ chọn, không ảnh hưởng global).
- **Stuck worker:** recompute job tự reset row `processing` quá 30 phút ở đầu mỗi run.
