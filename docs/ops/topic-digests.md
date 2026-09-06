# Topic Digests — Operational Notes

Topic digests lưu trend metrics (`doc_count`, `avg_quality_score`, `trend_score`, `is_stale`) theo topic và thời gian — trả lời câu hỏi *topic nào hot trong kỳ này?*

Có thể xem **tất cả sources** (mặc định) hoặc lọc theo **1 hoặc nhiều source group** (Facebook KOL, Tiktoker, …).

---

## Bảng dữ liệu

| Bảng | Vai trò |
|------|---------|
| `source_groups` | Nhóm nguồn trong workspace — mỗi job/document thuộc đúng một group |
| `dim_dates` | Lịch tĩnh, seed một lần (~10–20 năm) |
| `topic_digest_daily` | Metrics theo ngày — **nguồn duy nhất** cho tất cả period presets |

`documents.group_id` và `jobs.group_id` là **NOT NULL** ở tầng application (FK restrict tại DB, reassignment phải xảy ra trước khi xóa group). `topic_digest_daily.group_id` có FK CASCADE → khi group bị xóa, digest rows của group đó bị xóa tự động.

---

## Cơ chế hoạt động

```
Document được classify (gán / bỏ gán topic)
    → nếu document.group_id IS NOT NULL:
        invalidate daily row cho (topic, date, group)
    → debounce
    → recompute job tính lại daily metrics (per group)
    → re-rank trend_rank per (workspace, group)
```

**Partition theo source group** — mỗi row daily là `(topic_id, date_key, group_id)`:

| `group_id` | Ý nghĩa |
|------------|---------|
| UUID source group | Chỉ documents có `documents.group_id = UUID` |

> Không còn "global partition" hay sentinel UUID. Query "tất cả" = không filter `group_id` — aggregate mọi partitions.

Khi classify một document: chỉ invalidate partition của `document.group_id`. Documents không có group (null) không được tính vào bất kỳ partition nào.

Digest rows tạo **on-demand** — không pre-fill toàn bộ lịch sử.

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

### trend_score

```
trend_score = doc_count × avg_quality_score × DAILY_RECENCY_WEIGHT
```

Query topic cards SUM `trend_score` trực tiếp từ daily rows cho mọi period preset (không cần rollup pre-aggregation). Calendar presets (this_week, this_month, …) nên được cache tại API layer (~15 phút).

---

## Sử dụng

### Topic cards (UI / API) — daily-only read path

Tất cả period presets đều đọc `topic_digest_daily` và SUM trong range.

| Period preset | Filter |
|---------------|--------|
| `last_7_days`, `last_30_days` | `group_id` + SUM date range |
| `this_week`, `last_week` | `group_id` + SUM full week dates |
| `this_month`, `last_month` | `group_id` + SUM full month dates |
| `custom` (≤90 ngày khuyến nghị) | `group_id` + SUM date range |

**Group filter:**

| Filter UI | Query |
|-----------|-------|
| Tất cả (không chọn group) | Không filter `group_id` — aggregate mọi group |
| Source group X | `group_id = X` |

**Sparkline:** luôn `topic_digest_daily`, 7 ngày, cùng group filter.

```
GET /api/topics/cards?period=last_7_days
GET /api/topics/cards?period=last_7_days&groupId=<source-group-uuid>
GET /api/topics/cards?period=this_month&groupId=<source-group-uuid>
```

---

## Quy mô dữ liệu

**Daily:** rows ≈ topics × days_active × groups_with_activity. Index `(group_id, date_key, topic_id)` cho group-filtered reads; index `(date_key, topic_id)` cho "all groups" reads.

**Rebuild:** mỗi recompute batch xử lý tối đa 200 rows. Không có rollup rebuild nên write path đơn giản hơn nhiều.

**Bulk taxonomy:** invalidate mọi daily partition → bulk drain recompute. Backlog lớn có thể mất vài giờ.

---

## Trạng thái stale

Sau invalidate, row có `is_stale = true` và metrics cũ vẫn đọc được cho đến khi recompute xong. API trả `isStale: true` — UI nên báo đang cập nhật.

Partition group mới chưa có row cho đến lần classify/recompute đầu tiên — filter group đó có thể trống tạm thời.

---

## Bulk taxonomy (merge / split topics)

Restructure taxonomy làm thay đổi hàng loạt `document_topics` → cần recompute digest. Dùng bulk invalidate workspace (đánh dấu `is_bulk_stale = true` trên **mọi** daily partition) và **bulk drain job** riêng.

| Job | Queue | Batch |
|-----|-------|-------|
| Recompute thường | `is_bulk_stale = false` | 200 |
| Bulk drain | `is_bulk_stale = true` | 50 |

---

## Group lifecycle

**Tạo group:** source group mới bắt đầu trống — digest rows populate dần khi documents trong group được classify.

**Xóa group (`DELETE /api/source-groups/:id`):**
- Tất cả jobs và documents của group bị moved sang group khác.
- Nếu caller cung cấp `moveToGroupId` trong request body → moved sang đó.
- Nếu không → moved sang group **Unassigned** (tạo on demand mỗi workspace, đánh dấu `is_unassigned = true`).
- Sau khi reassign xong, group bị xóa — `topic_digest_daily` rows của group đó cascade delete.
- Group **Unassigned** không thể bị xóa.

**Group Unassigned:** group đặc biệt per-workspace, tạo lần đầu khi cần. Hiển thị trong filter dropdown (có thể filter topic theo group này) nhưng ẩn trong management UI (không cho sửa/xóa).

---

## Lưu ý vận hành

- **Debounce:** burst classify liên tục trì hoãn recompute — metrics có thể lag tới ~1 giờ sau khi dữ liệu ổn định.
- **Fan-out classify:** mỗi classify invalidate đúng 1 daily partition (group của document). Documents không có group không được tính.
- **Documents không group** (`group_id` null): vẫn tồn tại nhưng không vào bất kỳ digest partition nào.
- **Stuck worker:** recompute job tự reset row `processing` quá 30 phút ở đầu mỗi run.
- **Calendar queries caching:** queries cho `this_week`, `this_month` nên cache kết quả ~15 phút tại API layer vì SUM nhiều ngày hơn rolling window presets.
- **Migration:** khi deploy, xóa sentinel rows cũ trước khi chạy migration (xem bên dưới).

---

## Migration notes (lần deploy đầu sau refactor)

Chạy SQL sau **trước** khi apply migration Drizzle (để tránh FK constraint violation khi thêm FK vào `topic_digest_daily.group_id`):

```sql
-- Xóa sentinel partition (không có group_id tương ứng trong source_groups)
DELETE FROM topic_digest_daily
WHERE group_id = '00000000-0000-0000-0000-000000000000';

-- Xóa bảng rollup (đã loại bỏ khỏi schema)
DROP TABLE IF EXISTS topic_digest_rollup;
```

Sau migrate, chạy `db:generate` và `db:migrate` như bình thường.
