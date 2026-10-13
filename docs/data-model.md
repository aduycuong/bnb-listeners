# Data model

Mô hình dữ liệu nhiều lớp cho hệ thống social listening. Tài liệu chỉ nêu các bảng và cột chính; schema Drizzle chi tiết sẽ được viết khi triển khai (theo `.cursor/rules/drizzle-schema-workflow.mdc`).

> `.ai/database-schema.md` vẫn mô tả **schema cũ**. Không dùng file đó làm tham chiếu cho hệ thống mới.

## Tổng quan

```text
L0  Raw archive      R2: payload gốc từ connector (thật và ảo)
L1  Raw store        sources · authors · content_items · engagement_snapshots
                     (+ personas · persona_panels · persona_panel_members cho dữ liệu giả)
L2  Project config   projects · project_entities · project_queries · project_aspects · project_sources
L3  Analysis         mentions · mention_entities · mention_aspects · mention_topics · mention_extractions · topics
L4  Aggregates       metrics_hourly · metrics_daily · (topic/aspect/author daily)
L5  Outputs          alert_rules · alerts · insights · reports
```

Các lớp chỉ phụ thuộc theo một chiều, từ dưới lên. Có thể xóa L3–L5 rồi tính lại hoàn toàn từ L1 + L2.

## Nguồn gốc dữ liệu (`origin`)

Mọi bản ghi ở L1 đều có cột `origin`:

| origin | Ý nghĩa | Payload R2 |
|---|---|---|
| `connector` | Thu thập từ nguồn thật | Có |
| `synthetic` | Sinh từ connector ảo (persona + LLM). Truy vết theo `collect_run_id` và `metadata.personaId` | Có (connector ảo là `DirectConnector`, đi cùng workflow thu thập) |
| `legacy_import` | Chuyển từ bảng `documents` cũ | Không có. Giữ id cũ trong `metadata` |

Dữ liệu giả và thật được phép trộn lẫn; chưa có quy tắc cô lập theo project (xem [D8](decisions.md#d8--giai-đoạn-2-persona--connector-ảo--kho-thô-2026-10-13)). Mọi số liệu đưa cho khách hàng phải lọc theo `origin`, vì kho thô dùng chung giữa các workspace.

`origin` được copy xuống `mentions` để mọi truy vấn và rollup lọc được mà không cần join.

## L0 — Raw archive (R2)

- Key: `raw/{platform}/{connector}/{yyyy}/{mm}/{dd}/{collect_run_id}.json`.
- Lưu nguyên văn để parse lại khi đổi parser. Không xóa khi xóa project.
- Media (ảnh, video) tiếp tục được lưu trên R2 như hiện nay.

## L1 — Raw store

Dùng chung, không gắn với workspace hay project. Dữ liệu `synthetic` phân biệt qua `origin`.

**`sources`**: nơi phát ra nội dung (page, group, kênh, trang báo, diễn đàn).
- `platform` (`facebook`, `tiktok`, `youtube`, `news`, `forum`, `classifieds`, …), `source_type` (`page`, `group`, `channel`, `site`, …)
- `external_id`, `url`, `name`, `follower_count`, `member_count`
- `activity_tier` (`hot`, `normal`, `low`, `paused`): dùng để quyết định tần suất quét; `activity_tier_locked` để ghim tier bằng tay
- `monthly_record_limit`: số bản ghi Bright Data tối đa mỗi tháng (null = không giới hạn)
- `origin`
- Unique: `(platform, external_id)`

**`authors`**: người hoặc tài khoản đăng nội dung.
- `platform`, `external_id`, `name`, `url`, `follower_count`
- `author_type` (`kol`, `agency`, `community`, `brand`, `individual`, `media`), được LLM gán và có thể sửa tay
- `origin`
- `persona_id` (nullable): chỉ có ở tác giả giả, trỏ tới persona đã sinh ra tác giả đó

**`content_items`**: gộp post, comment và reply vào một bảng.
- `kind` (`post`, `comment`, `reply`, `article`, `video`, `listing`)
- `parent_id`, `root_id`: cây hội thoại
- `platform`, `source_id`, `author_id`, `external_id`, `url`
- `text`, `media` (jsonb), `language`, `content_hash`
- `published_at`, `first_seen_at`, `last_collected_at`
- Engagement mới nhất: `like_count`, `comment_count`, `share_count`, `view_count`, `reactions` (jsonb)
- `origin`, `collect_run_id`, `metadata` (với dữ liệu giả: `personaId`, `panelId`, `brief`, ý định cảm xúc và aspect)
- Unique: `(platform, external_id)`

**`engagement_snapshots`**: chuỗi thời gian engagement, dùng để tính tốc độ lan truyền.
- `content_item_id`, `captured_at`, các bộ đếm
- Dữ liệu giả chưa sinh snapshot (để giai đoạn 6, khi test cảnh báo).

**`item_refresh_schedules`**: mốc lấy lại comment kế tiếp của từng bài.
- `content_item_id`, `next_refresh_at`, `checkpoint_hours`, `comments_collected_count`, `comments_collected_at`
- Dòng bị xóa khi bài qua mốc cuối cùng.

**`collect_runs`**: mỗi lần chạy của một connector.
- `connector`, `params`, `status`, `r2_key`, `item_count`, `error`

**`personas`**, **`persona_panels`**, **`persona_panel_members`** (chỉ dùng cho dữ liệu giả):
- `personas`: `name`, `kind` (`individual`, `organization`), `description`, `tone`, `concerns[]`, `attributes` (jsonb), `version`, `source` (`template`, `manual`, `llm_generated`), `review_status`
- `persona_panels`: `name`, `description`
- `persona_panel_members`: `panel_id`, `persona_id`, `weight`

Chi tiết và cách dùng: [synthetic-data.md](synthetic-data.md). `scenarios` và `synthetic_labels` chưa có trong schema (để sau).

## L2 — Project config

**`projects`**: `workspace_id`, `name`, `case`, `mode` (`live` | `sandbox`), `timezone`, `config_version`

**`project_entities`**: đối tượng được theo dõi.
- `role` (`primary`, `competitor`, `product`, `person`)
- `name`, `aliases[]`, `color`

**`project_queries`**: điều kiện để một nội dung được tính là mention.
- `entity_id` (nullable)
- `include` (từ khóa chính), `with` (bắt buộc đi kèm), `exclude`, `proximity`
- `version`: tăng mỗi khi sửa, kéo theo việc so khớp lại

**`project_aspects`**: bộ khía cạnh (pháp lý, tiến độ, giá & thanh toán…). Khởi tạo từ template theo ngành/case, sửa được.

**`project_sources`**: nguồn theo dõi chủ động (bắt buộc với Facebook) và platform được bật cho project.

**`project_scenarios`**: các scenario gắn vào project sandbox. Chưa làm; chỉ cần khi có `scenarios` (xem [D8](decisions.md#d8--giai-đoạn-2-persona--connector-ảo--kho-thô-2026-10-13)).

## L3 — Analysis

**`mentions`**: một nội dung khớp với một project.
- `project_id`, `content_item_id`, `root_item_id`, `kind`
- Copy từ L1 để lọc nhanh: `platform`, `source_id`, `author_id`, `published_at`, `origin`
- So khớp: `matched_query_ids[]`, `is_relevant`, `match_version`
- Làm giàu: `sentiment` (`positive` | `neutral` | `negative`), `sentiment_score`, `emotion`, `enrich_status`, `enrich_version`
- Chỉ số: `reach_estimate`, `engagement_total`
- `user_corrected`: nhãn đã được người dùng sửa tay
- Unique: `(project_id, content_item_id)`. Partition theo tháng của `published_at`.

**`mention_entities`**: `mention_id`, `entity_id`, `sentiment`. Dùng cho SoV và so sánh đối thủ.

**`mention_aspects`**: `mention_id`, `aspect_id`, `sentiment`

**`mention_topics`**: `mention_id`, `topic_id`, `confidence`

**`mention_extractions`**: các trường riêng theo case.
- `mention_id`, `schema_key` (ví dụ `price_quote`, `violation`, `buyer_question`, `location`), `data` (jsonb, validate bằng zod)

**`topics`**: chủ đề theo project, gom cụm từ embedding rồi để LLM đặt tên.
- `project_id`, `name`, `description`, `status`, `merged_into_id`

Embedding của mention được dùng cho gom cụm topic và hỏi đáp AI. Có thể lưu ở bảng riêng `mention_embeddings` hoặc theo `content_item_id`, quyết định khi làm.

## L4 — Aggregates

Cập nhật tăng dần bằng cơ chế stale-queue. Dashboard chỉ đọc từ L4; chỉ khi drill-down mới đọc L3.

**`metrics_hourly`** và **`metrics_daily`**
- Khóa: `project_id`, `bucket`, `platform`, `source_type`, `entity_id` (nullable = tổng), `sentiment`, `origin`
- Giá trị: `mention_count`, `engagement`, `reach`, `unique_authors`

Các bảng phụ theo ngày, thêm khi cần: `topic_metrics_daily`, `aspect_metrics_daily`, `author_metrics_daily`, `place_metrics_daily`.

Các công thức (reach ước tính, NSS, SoV, mức độ khủng hoảng) đặt trong `lib/` để dùng chung, không viết trong SQL rải rác.

## L5 — Outputs

- **`alert_rules`**: `project_id`, `type` (ngưỡng, bất thường, từ khóa mới), `params`, `channels`
- **`alerts`**: `rule_id`, `triggered_at`, `payload`, `status`, `mention_ids[]`
- **`insights`**: tóm tắt và nhận định do AI sinh. Luôn kèm `mention_ids[]` để trích dẫn, kèm `period` và `model`.
- **`reports`**: báo cáo định kỳ (`period`, `content`, `status`)

## Chuyển dữ liệu `documents` cũ

- `documents` có `doc_type = post` chuyển thành `content_items` (`kind = post`, `origin = legacy_import`). Các field dùng được: `metadata.postId`, `authorName`, `groupName`, `groupMembers`, engagement, `publishedAt`.
- `comments` gắn với các post đó chuyển thành `content_items` (`kind = comment` hoặc `reply`, `parent_id` trỏ tới post).
- `sources` và `authors` được tạo từ metadata (group/page, tác giả).
- Không chuyển: `document_parts`, `chunks`, `terms`, `document_terms`, digest. Phân tích sẽ chạy lại trên pipeline mới.
- Export bảng cũ ra file trước khi drop.
