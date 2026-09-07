# Topic Digests — Operational Notes

Topic digests lưu trend metrics (`doc_count`, `avg_quality_score`, `trend_score`, `is_stale`) theo topic và thời gian — trả lời câu hỏi *topic nào hot trong kỳ này?*

Có thể xem **tất cả jobs** (mặc định) hoặc lọc theo **1 hoặc nhiều scrape job**.

---

## Bảng dữ liệu

| Bảng | Vai trò |
|------|---------|
| `jobs` | Scrape job trong workspace — mỗi document thuộc đúng một job |
| `dim_dates` | Lịch tĩnh, seed một lần (~10–20 năm) |
| `topic_digest_daily` | Metrics theo ngày — **nguồn duy nhất** cho tất cả period presets |

`documents.job_id` là **NOT NULL**. `topic_digest_daily.job_id` có FK CASCADE → khi job bị xóa, documents/chunks/digest rows của job đó bị xóa theo cascade.

---

## Cơ chế hoạt động

```
Document được classify (gán / bỏ gán topic)
    → invalidate daily row cho (topic, date, job_id)
        (is_stale = true, stale_since = COALESCE(...) hoặc reset nếu processing)
    → recompute job (mỗi 15 phút) claim rows stale, FIFO theo stale_since
    → compute metrics, finalize có điều kiện
```

**Partition theo job** — mỗi row daily là `(topic_id, date_key, job_id)`:

| `job_id` | Ý nghĩa |
|----------|---------|
| UUID job | Chỉ documents có `documents.job_id = UUID` |

Query "tất cả" = không filter `job_id` — aggregate mọi partitions.

Digest rows tạo **on-demand** — không pre-fill toàn bộ lịch sử.

---

## Cấu hình

Hằng số trong `lib/topic-digests/constants.ts`:

| Hằng số | Mặc định | Ý nghĩa |
|---------|----------|---------|
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
| `last_7_days`, `last_30_days` | optional `jobIds` + SUM date range |
| `this_week`, `last_week` | optional `jobIds` + SUM full week dates |
| `this_month`, `last_month` | optional `jobIds` + SUM full month dates |

```
GET /api/topics/cards?period=last_7_days
GET /api/topics/cards?period=last_7_days&jobIds=<job-uuid>,<job-uuid>
```
