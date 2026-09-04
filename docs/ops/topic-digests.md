# Topic Digests — Operational Notes

Topic digests cung cấp trend metrics (`doc_count`, `avg_quality_score`, `trend_score`, `trend_rank`) cho từng topic theo thời gian, phục vụ câu hỏi "topic nào hot trong kỳ này?".

Hệ thống gồm ba bảng:

| Bảng | Vai trò |
|------|---------|
| `dim_dates` | Calendar dimension tĩnh, seed một lần |
| `topic_digest_daily` | Daily grain — source of truth |
| `topic_digest_rollup` | Pre-aggregated theo tuần / tháng / quý / năm |

## dim_dates

Bảng tĩnh, không bao giờ thay đổi sau khi seed. Pre-compute `week_start`, `month_start`, `quarter_start`, `year_start` để rollup GROUP BY không cần runtime `date_trunc`. Seed cho ~10–20 năm (~3 650–7 300 rows).

## Luồng dữ liệu

```
Document với published_at = '2026-09-04'
    ↓ gán vào topic
topic_digest_daily (topic_id, date_key='2026-09-04') → is_stale = true
    ↓ debounce 1 giờ
recompute job picks up → tính doc_count, avg_quality, trend_score
    ↓
rollup job → upsert topic_digest_rollup cho week/month/quarter/year chứa ngày đó
    ↓
re-rank trong workspace → cập nhật trend_rank
```

## Invalidation và debounce — topic_digest_daily

Khi document được gán vào topic, chỉ đúng một daily row bị invalidate — row tương ứng với `date(published_at)` của document đó:

```sql
INSERT INTO topic_digest_daily (topic_id, date_key, is_stale, recompute_after)
VALUES ($1, $2, true, now() + interval '1 hour')
ON CONFLICT (topic_id, date_key) DO UPDATE
  SET is_stale        = true,
      recompute_after = GREATEST(
        topic_digest_daily.recompute_after,
        now() + interval '1 hour'
      );
```

Hằng số `DIGEST_DEBOUNCE_MS` trong `lib/topic-digests/constants.ts` kiểm soát khoảng debounce (mặc định 1 giờ). Nếu documents liên tục vào topic, `recompute_after` bị đẩy ra xa — recompute chỉ xảy ra sau khi dữ liệu "im" đủ 1 giờ.

Rows mới được tạo on-demand khi document đầu tiên vào topic — không có pre-population.

## Recompute job — topic_digest_daily

Chạy theo cron mỗi 15 phút. Pick up stale rows dùng **lease pattern** để tránh 2 workers xử lý cùng row:

```sql
-- 1. Claim (atomic, bỏ qua rows đang bị giữ bởi worker khác)
UPDATE topic_digest_daily
SET processing = true, processing_started_at = now()
WHERE (topic_id, date_key) IN (
  SELECT topic_id, date_key FROM topic_digest_daily
  WHERE is_stale = true
    AND processing = false
    AND recompute_after <= now()
  LIMIT 200
  FOR UPDATE SKIP LOCKED
);

-- 2. Compute metrics cho mỗi claimed row, sau đó:
UPDATE topic_digest_daily
SET doc_count        = $doc_count,
    avg_quality_score = $avg,
    trend_score      = $score,
    is_stale         = false,
    processing       = false,
    computed_at      = now()
WHERE topic_id = $1 AND date_key = $2;
```

Reset stuck workers (chạy đầu mỗi job run):

```sql
UPDATE topic_digest_daily
SET processing = false, processing_started_at = null
WHERE processing = true
  AND processing_started_at < now() - interval '30 minutes';
```

## trend_score — daily grain

```
trend_score = doc_count × avg_quality_score × recency_weight
```

Daily grain dùng `recency_weight = 1.5` (ngày nào vừa xảy ra rất hot). Hệ số cấu hình trong `lib/topic-digests/constants.ts`.

## Rollup job — topic_digest_rollup

Chạy ngay sau khi recompute job hoàn thành. Xác định các kỳ bị ảnh hưởng từ tập `date_key` vừa được compute, rồi upsert từng kỳ:

```sql
-- Ví dụ cho grain 'month'
INSERT INTO topic_digest_rollup
  (topic_id, period_grain, period_start, period_end,
   doc_count, avg_quality_score, trend_score, computed_at)
SELECT
  tdd.topic_id,
  'month',
  d.month_start,
  (d.month_start + interval '1 month' - interval '1 day')::date,
  SUM(tdd.doc_count),
  AVG(tdd.avg_quality_score),
  SUM(tdd.doc_count) * AVG(tdd.avg_quality_score) * 1.0,  -- weight tháng
  now()
FROM topic_digest_daily tdd
JOIN dim_dates d ON d.date_key = tdd.date_key
WHERE d.month_start = $month_start
GROUP BY tdd.topic_id, d.month_start
ON CONFLICT (topic_id, period_grain, period_start) DO UPDATE SET ...;

-- Re-rank trong workspace
UPDATE topic_digest_rollup tdr
SET trend_rank = ranked.new_rank
FROM (
  SELECT tdr2.topic_id,
         RANK() OVER (
           PARTITION BY t.workspace_id
           ORDER BY tdr2.trend_score DESC NULLS LAST
         ) AS new_rank
  FROM topic_digest_rollup tdr2
  JOIN topics t ON t.id = tdr2.topic_id
  WHERE tdr2.period_grain = 'month' AND tdr2.period_start = $month_start
) ranked
WHERE tdr.topic_id = ranked.topic_id
  AND tdr.period_grain = 'month'
  AND tdr.period_start = $month_start;
```

Chỉ rebuild đúng kỳ bị ảnh hưởng — không rebuild toàn bộ lịch sử.

## trend_score — rollup grain

Mỗi grain dùng recency_weight riêng (định nghĩa trong `lib/topic-digests/constants.ts`):

| grain | recency_weight |
|-------|---------------|
| `week` | `1.2` |
| `month` | `1.0` |
| `quarter` | `0.9` |
| `year` | `0.8` |

Rollup **không cộng dồn** `trend_score` từ daily — mà tính lại với weight của grain. Đảm bảo score weekly và monthly không so sánh sai đơn vị.

## Query patterns

Query theo ngày thì dùng `topic_digest_daily`. Query theo tuần/tháng/quý/năm dùng `topic_digest_rollup`. Arbitrary range thì GROUP BY trên daily:

```sql
-- Hôm nay (daily)
WHERE t.workspace_id = $1 AND tdd.date_key = CURRENT_DATE

-- Hôm qua
WHERE tdd.date_key = CURRENT_DATE - 1

-- Tháng này (rollup)
WHERE tdr.period_grain = 'month'
  AND tdr.period_start = date_trunc('month', CURRENT_DATE)::date

-- Tháng trước
  AND tdr.period_start = date_trunc('month', CURRENT_DATE - interval '1 month')::date

-- Quý này
WHERE tdr.period_grain = 'quarter'
  AND tdr.period_start = date_trunc('quarter', CURRENT_DATE)::date

-- Arbitrary range (15/8 – 30/9) — GROUP BY từ daily
WHERE tdd.date_key BETWEEN '2026-08-15' AND '2026-09-30'
GROUP BY t.id, t.name
```

## Trạng thái stale trong thời gian chờ

Daily rows tồn tại với `is_stale = true` sau invalidation. API trả về dữ liệu cũ cùng flag `is_stale: true` cho đến khi compute xong. Client nên hiển thị trạng thái stale thay vì ẩn data.

## Rủi ro: bulk re-classification

Khi restructure taxonomy (merge/split topics), hàng nghìn `document_topics` thay đổi cùng lúc — tương đương với bulk add/remove documents khỏi các topics, nên digests phải được recompute.

Vấn đề: nếu toàn bộ backlog rows ập vào recompute job thường, chúng sẽ chiếm hết capacity và delay các invalidation bình thường hàng ngày.

### Giải pháp: tách bulk drain job riêng

Thay vì per-row invalidation từ application code, sau bulk taxonomy op dùng SQL sau để đánh dấu `is_bulk_stale = true`:

```sql
UPDATE topic_digest_daily
SET is_stale        = true,
    is_bulk_stale   = true,
    recompute_after = GREATEST(recompute_after, now() + interval '1 hour')
WHERE topic_id IN (SELECT id FROM topics WHERE workspace_id = $1);
```

Hai job queue tách biệt nhờ partial index:

| Job | Index sử dụng | LIMIT gợi ý | Ghi chú |
|-----|---------------|-------------|---------|
| Recompute job thường | `idx_topic_digest_daily_stale` (`is_bulk_stale = false`) | 200 rows/run | Không bị ảnh hưởng bởi bulk op |
| Bulk drain job | `idx_topic_digest_daily_bulk_stale` (`is_bulk_stale = true`) | 50–100 rows/run | Chạy cùng cron, ưu tiên thấp hơn |

Sau khi bulk drain job recompute xong một row, reset `is_bulk_stale = false` cùng lúc với `is_stale = false` để row không bị pick up lại bởi bulk drain job trong lần chạy tiếp theo.

### Trade-off

Với 5.000 stale rows và bulk drain job LIMIT 100 mỗi 15 phút (~400 rows/giờ), toàn bộ backlog drain trong ~12.5 giờ. Đây là hành vi chấp nhận được vì taxonomy restructure là sự kiện ops hiếm gặp, không phải traffic thường ngày.
