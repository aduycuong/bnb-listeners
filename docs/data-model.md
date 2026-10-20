# Data model

Mô hình dữ liệu nhiều lớp cho hệ thống social listening. Tài liệu chỉ nêu các bảng và cột chính; schema Drizzle chi tiết sẽ được viết khi triển khai (theo `.cursor/rules/drizzle-schema-workflow.mdc`).

> `.ai/database-schema.md` vẫn mô tả **schema cũ**. Không dùng file đó làm tham chiếu cho hệ thống mới.

## Tổng quan

```text
L0  Raw archive      R2: payload gốc từ connector (thật và ảo)
L1  Raw store        sources · authors · content_items · engagement_snapshots
                     (+ personas · persona_panels · persona_panel_members cho dữ liệu giả)
L2  Project config   projects · project_entities · project_queries · project_aspects · project_sources
L3  Analysis         mentions · mention_entities · mention_aspects · mention_topics · mention_keywords · mention_extractions · topics
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
- `metadata.idStable = false`: id không ổn định giữa các lần cào (Facebook `pfbid`, dạng id ẩn danh của người dùng), cùng một người có thể có nhiều dòng. Xem [D9](decisions.md#d9--lấy-reply-và-định-danh-tác-giả-comment-2026-10-14)

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

Chi tiết và cách dùng: [synthetic-data.md](synthetic-data.md). `scenarios` chưa có trong schema (để sau). Dữ liệu giả không có bảng nhãn riêng: không dùng để kiểm chứng (D12).

## L2 — Project config

**`projects`**: `workspace_id`, `name`, `case` (id case BĐS, xem [D10](decisions.md#d10--giai-đoạn-3-case-bđs-và-cấu-hình-project-2026-10-14)), `case_version` (phiên bản định nghĩa case project đang chạy, người dùng tự nâng cấp), `timezone`, `config_version`, `case_config` (jsonb, trường riêng theo case), `match_signature` + `matched_at` (lần so khớp toàn bộ gần nhất), `notification_config` (jsonb: kênh gửi, người nhận, lịch báo cáo AI). Không còn `mode` hay `is_demo`: mọi project dùng số liệu thật.

**`project_entities`**: đối tượng được theo dõi.
- `role` (`primary`, `competitor`, `product`, `person`, `area`)
- `name`, `aliases[]`, `color`, `sort_order`

**`project_queries`**: điều kiện để một nội dung được tính là mention.
- `entity_id` (nullable)
- `include` (từ khóa chính, khớp một trong các từ), `with_terms` (bắt buộc đi kèm ít nhất một từ), `exclude`, `proximity`, `ambiguous` (tên dễ nhầm: chỉ khớp qua các từ này thì LLM xác nhận)
- `version`: tăng mỗi khi sửa `include`, `with_terms`, `exclude`, kéo theo việc so khớp lại

**`project_aspects`**: bộ khía cạnh (pháp lý, tiến độ, giá & thanh toán…). Khởi tạo từ template theo case, sửa được.
- `key`, `name`, `description`, `sort_order`

**`project_sources`**: nguồn theo dõi chủ động (bắt buộc với Facebook). Nguồn `origin = connector` và nguồn giả đều chọn được, rồi được xử lý và tính số liệu như nhau.

**`project_scenarios`**: các scenario gắn vào project sandbox. Chưa làm; chỉ cần khi có `scenarios` (xem [D8](decisions.md#d8--giai-đoạn-2-persona--connector-ảo--kho-thô-2026-10-13)).

## L3 — Analysis

**`mentions`**: một nội dung khớp với một project (xem [D11](decisions.md#d11--giai-đoạn-3-match-2026-10-14)).
- `project_id`, `content_item_id`, `root_item_id`, `kind`
- Copy từ L1 để lọc nhanh: `platform`, `source_id`, `author_id`, `published_at`, `origin`
- So khớp: `matched_query_ids[]`, `matched_entity_ids[]`, `matched_terms[]`, `match_type` (`direct` | `context` | `manual`), `match_tier` (`lexical` | `llm` | `user`), `is_relevant` (giá trị cuối cùng: theo nhãn nếu có; ứng viên bị LLM loại vẫn được lưu với `false`), `auto_is_relevant` (quyết định của Match), `match_reason`, `match_signature`
- Enrich ([D14](decisions.md#d14--giai-đoạn-4b-enrich-2026-10-14)): `sentiment` (theo nhãn nếu có), `auto_sentiment` (của AI), `sentiment_score`, `emotion`, `enrich_status` (`pending` | `done` | `skipped` | `failed`), `enrich_signature`, `enriched_content_hash`, `enriched_at`
- Làm giàu: `sentiment` (`positive` | `neutral` | `negative`), `sentiment_score`, `emotion`, `enrich_status`, `enrich_version`
- Chỉ số: `reach_estimate`, `engagement_total`
- `user_corrected`: nhãn đã được người dùng sửa tay
- Unique: `(project_id, content_item_id)`. Partition theo tháng của `published_at`.

**`item_labels`**: nhãn tay của một item trong một project (`is_relevant`, `sentiment`, `aspect_keys`: null = chưa gán, [] = không có aspect), `sample_id` nếu gán trong đợt mẫu, `labeled_by`. Tách khỏi kết quả của hệ thống để đo ([D13](decisions.md#d13--nhãn-tay-và-đo-trên-mẫu-thật-2026-10-14)).

**`label_samples`**, **`label_sample_items`**: đợt mẫu ngẫu nhiên. `kind = match`: phân tầng (`relevant`, `rejected`, `unmatched`) kèm kích thước từng tầng. `kind = enrich`: mention có liên quan đã làm giàu (tầng `enriched`).

**`match_judgments`**: cache quyết định của tầng 2 theo nội dung item, bài gốc và bộ từ khóa của entity; dùng chung giữa các project.

**`mention_entities`**: `mention_id`, `entity_id`, `sentiment`. Dùng cho SoV và so sánh đối thủ.

**`mention_aspects`**: `mention_id`, `aspect_id`, `source` (`auto`), `sentiment`. Chỉ chứa kết quả AI; aspect gán tay ở `item_labels.aspect_keys` được ưu tiên.

**`mention_topics`**: `mention_id` (khóa chính: một mention thuộc tối đa một topic), `topic_id`, `confidence` (1 khi LLM gán). Xem [D15](decisions.md#d15--giai-đoạn-4c-topic-2026-10-15).

**`mention_keywords`**: `mention_id`, `keyword` (chuẩn hóa: chữ thường, NFC, giữ dấu), `text` (cách model viết). Enrich trích 0–3 từ khóa mỗi mention, không lấy tên đối tượng của project; đám mây từ khóa đếm thẳng từ bảng này. Xem [D16](decisions.md#d16--từ-khóa-2026-10-15).

**`mention_extractions`**: các trường riêng theo case.
- `mention_id`, `schema_key` (ví dụ `price_quote`, `violation`, `buyer_question`, `location`), `data` (jsonb, validate bằng zod)

**`topics`**: chủ đề theo project, LLM gom `mentions.topic_hint` thành topic và đặt tên (D15).
- `project_id`, `name`, `description`, `aspect_id` (nullable), `status` (`active` | `hidden` | `merged`), `merged_into_id`, `centroid` (vector), `mention_count`

**`mention_embeddings`**: `mention_id`, `kind` (`topic_hint`), `model`, `text_hash`, `embedding`. Khóa chính `(mention_id, kind)`. Dùng để tìm topic nên gộp và sau này cho hỏi đáp AI.

Trên `mentions`: `topic_hint` (từ Enrich), `topic_status` (`pending` | `assigned` | `unassigned` | `none`).

## L4 — Aggregates

Cập nhật tăng dần bằng cơ chế stale-queue. Dashboard chỉ đọc từ L4; chỉ khi drill-down mới đọc L3.

Chưa làm: Topics, Overview và Sentiment hiện đọc thẳng L3 qua `lib/metrics/` và `lib/topics/` vì dữ liệu còn nhỏ ([D17](decisions.md#d17--giai-đoạn-5b-số-liệu-dashboard-2026-10-15)).

**`metrics_hourly`** và **`metrics_daily`**
- Khóa: `project_id`, `bucket`, `platform`, `source_type`, `entity_id` (nullable = tổng), `sentiment`, `origin`
- Giá trị: `mention_count`, `engagement`, `reach`, `unique_authors`

Các bảng phụ theo ngày, thêm khi cần: `topic_metrics_daily`, `aspect_metrics_daily`, `author_metrics_daily`, `place_metrics_daily`.

Các công thức (tương tác, NSS, SoV, mức độ khủng hoảng; reach khi có nguồn có lượt xem) đặt trong `lib/metrics/` để dùng chung, không viết trong SQL rải rác.

## L5 — Outputs

- **`alert_rules`**: `project_id`, `kind` (loại rule trong danh mục, một loại có thể lặp lại), `params` (`scope`, `threshold`, `window`, `minMentions`, `keywords`, validate theo loại), `channels` (null = dùng `projects.notification_config`), `enabled`, `sort_order`. Đã lưu từ giai đoạn 3, đánh giá từ giai đoạn 6.
- **`alerts`**: `rule_id`, `triggered_at`, `payload`, `status`, `mention_ids[]`
- **`insights`**: tóm tắt và nhận định do AI sinh. Luôn kèm `mention_ids[]` để trích dẫn, kèm `period` và `model`.
- **`reports`**: báo cáo định kỳ (`period`, `content`, `status`)

## Chuyển dữ liệu `documents` cũ

- `documents` có `doc_type = post` chuyển thành `content_items` (`kind = post`, `origin = legacy_import`). Các field dùng được: `metadata.postId`, `authorName`, `groupName`, `groupMembers`, engagement, `publishedAt`.
- `comments` gắn với các post đó chuyển thành `content_items` (`kind = comment` hoặc `reply`, `parent_id` trỏ tới post).
- `sources` và `authors` được tạo từ metadata (group/page, tác giả).
- Không chuyển: `document_parts`, `chunks`, `terms`, `document_terms`, digest. Phân tích sẽ chạy lại trên pipeline mới.
- Export bảng cũ ra file trước khi drop.
