# Data model

Mô hình dữ liệu nhiều lớp cho hệ thống social listening. Tài liệu chỉ nêu các bảng và cột chính; schema Drizzle chi tiết sẽ được viết khi triển khai (theo `.cursor/rules/drizzle-schema-workflow.mdc`).

> `.ai/database-schema.md` vẫn mô tả **schema cũ**. Không dùng file đó làm tham chiếu cho hệ thống mới.

## Tổng quan

```text
L0  Raw archive      R2: payload gốc từ connector (thật và ảo)
L1  Raw store        sources · authors · content_items · engagement_snapshots
                     (+ personas · persona_panels · persona_panel_members cho dữ liệu giả)
L2  Project config   projects · project_entities · project_queries · project_aspects · project_sources · project_enrichers
L3  Analysis         mentions · mention_enrichments · mention_sentiments · mention_entities · mention_aspects · mention_extractions · mention_terms · term_dictionary · topics · mention_topics · mention_embeddings
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
- `platform` (`facebook`, `tiktok`, `youtube`, `news`, `forum`, `classifieds`, …), `source_type` (`page`, `group`, `channel`, `search`, `site`, …). `search` là một lượt tìm từ khóa coi như nguồn (hiện chỉ có TikTok, xem [D19](decisions.md#d19--tiktok-qua-tikhub-2026-10-22)).
- `external_id`, `url`, `name`, `follower_count`, `member_count`. TikTok: kênh dùng id số của tài khoản; nguồn `search` dùng `<REGION>:<từ khóa>` và không có `url`.
- `activity_tier` (`hot`, `normal`, `low`, `paused`): dùng để quyết định tần suất quét; `activity_tier_locked` để ghim tier bằng tay
- `monthly_record_limit`: số bản ghi giao về tối đa mỗi tháng (null = không giới hạn). Bright Data tính tiền theo bản ghi; TikHub tính theo request nên với TikTok giá trị này chưa phản ánh chi phí (D19)
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
- `text`, `media` (jsonb: ảnh, video, và transcript của video `{ type: "transcript", url, text, language, source, rawText?, correction? }`, xem [D21](decisions.md#d21--transcript-video-tiktok-2026-10-22) và [D22](decisions.md#d22--sửa-transcript-bằng-llm-theo-tên-đối-tượng-2026-10-22)), `language`, `content_hash` (hash của text cùng transcript)
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
- `connector`, `params`, `status`, `r2_key`, `item_count`, `stats`, `error`. Với TikTok, `stats` có `requests` (số request TikHub của run).

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
- `user_corrected`: nhãn đã được người dùng sửa tay
- Unique: `(project_id, content_item_id)`. Partition theo tháng của `published_at`.
- Không chứa kết quả Enrich: cảm xúc, trạng thái làm giàu, gợi ý topic nằm ở các bảng riêng ([D18](decisions.md#d18--tách-enrich-theo-từng-loại-2026-10-21)).

**`item_labels`**: nhãn tay của một item trong một project (`is_relevant`, `sentiment`, `aspect_keys`: null = chưa gán, [] = không có aspect), `sample_id` nếu gán trong đợt mẫu, `labeled_by`. Tách khỏi kết quả của hệ thống để đo ([D13](decisions.md#d13--nhãn-tay-và-đo-trên-mẫu-thật-2026-10-14)).

**`label_samples`**, **`label_sample_items`**: đợt mẫu ngẫu nhiên. `kind = match`: phân tầng (`relevant`, `rejected`, `unmatched`) kèm kích thước từng tầng. `kind = enrich`: mention có liên quan đã làm giàu (tầng `enriched`).

**`match_judgments`**: cache quyết định của tầng 2 theo nội dung item, bài gốc và bộ từ khóa của entity; dùng chung giữa các project.

**`project_enrichers`**: enricher nào một project chạy (`enricher_key`, `enabled`, `config`). Seed từ case template; bật thêm được khi mở rộng report ([D18](decisions.md#d18--tách-enrich-theo-từng-loại-2026-10-21)).

**`mention_enrichments`**: trạng thái từng enricher trên một mention (`enricher_key`, `status` `pending` | `done` | `failed` | `waiting`, `signature`, `content_hash`, `model`). Chữ ký riêng từng loại nên bump một enricher không chạy lại các loại khác.

**`mention_sentiments`**: kết quả AI (`sentiment`, `sentiment_score`, `emotion`). Sentiment hiệu lực = nhãn tay nếu có, không thì hàng này.

**`mention_entities`**: `mention_id`, `entity_id`, `sentiment`. Dùng cho SoV và so sánh đối thủ.

**`mention_aspects`**: `mention_id`, `aspect_id`, `sentiment`. Chỉ chứa kết quả AI; aspect gán tay ở `item_labels.aspect_keys` được ưu tiên.

**`mention_extractions`**: lớp thô per-mention (`schema_key` + `data` jsonb): trường riêng theo case (`price_quote`, `buyer_question`, …) và đầu vào stage (`topic_hint`, `terms`).

**`mention_terms`**: từ ngữ đã chuẩn hóa sau stage `terms_index` (`kind` `keyword` | `place` | `brand` | `org`, `term`, `text`). Đám mây từ khóa đọc `kind = keyword`.

**`term_dictionary`**: đồng nghĩa và ẩn term (`scope_type` `workspace` | `project`, `kind`, `canonical`, `aliases[]`, `hidden`).

**`topics`**: nhóm mention theo `kind` (`topic` | `buyer_question` | sau này `argument`). LLM gom `topic_hint` thành topic và `buyer_question.question` thành nhóm FAQ, rồi đặt tên (D15). `attributes` jsonb cho trường riêng từng kind.

**`mention_topics`**: khóa `(mention_id, kind)` — một mention thuộc tối đa một nhóm mỗi kind. `kind` trùng `topics.kind` (FK ghép).

**`mention_embeddings`**: `mention_id`, `kind` (`topic_hint` | `buyer_question`), `model`, `text_hash`, `embedding`. Khóa chính `(mention_id, kind)`.

## L4 — Aggregates

Cập nhật tăng dần bằng cơ chế stale-queue. Dashboard chỉ đọc từ L4; chỉ khi drill-down mới đọc L3.

Chưa làm: Topics, Overview và Sentiment hiện đọc thẳng L3 qua `lib/metrics/` và `lib/topics/` vì dữ liệu còn nhỏ ([D17](decisions.md#d17--giai-đoạn-5b-số-liệu-dashboard-2026-10-15)).

**`metrics_hourly`** và **`metrics_daily`**
- Khóa: `project_id`, `bucket`, `platform`, `source_type`, `entity_id` (nullable = tổng), `sentiment`, `origin`
- Giá trị: `mention_count`, `engagement`, `reach`, `unique_authors`

Các bảng phụ theo ngày, thêm khi cần: `topic_metrics_daily`, `aspect_metrics_daily`, `author_metrics_daily`, `place_metrics_daily`.

Các công thức (tương tác, NSS, SoV, mức độ khủng hoảng; reach khi có nguồn có lượt xem) đặt trong `lib/metrics/` để dùng chung, không viết trong SQL rải rác.

## L5 — Outputs

- **`alert_rules`**: `project_id`, `kind` (loại rule trong danh mục, một loại có thể lặp lại), `params` (`scope`, `threshold`, `window`, `minMentions`, `keywords`, validate theo loại), `channels` (null = dùng `projects.notification_config`), `enabled`, `sort_order`. Đánh giá mỗi giờ (D23).
- **`alerts`**: một lần quy tắc kích hoạt. `project_id`, `rule_id` (xóa rule thì xóa cảnh báo), `kind`, `level` (`high` | `med` | `low`), `title`, `body`, `status` (`open` chỉ ghi nhận, `emailed`, `email_failed`), `payload`, `mention_ids`, `dedupe_key`, `bucket`, `window_start`, `triggered_at`, `emailed_at`, `email_error`. Chỉ gửi email.
- **`insights`**: tóm tắt và nhận định do AI sinh. Luôn kèm `mention_ids[]` để trích dẫn, kèm `period` và `model`.
- **`reports`**: báo cáo định kỳ (`period`, `content`, `status`)

## Chuyển dữ liệu `documents` cũ

- `documents` có `doc_type = post` chuyển thành `content_items` (`kind = post`, `origin = legacy_import`). Các field dùng được: `metadata.postId`, `authorName`, `groupName`, `groupMembers`, engagement, `publishedAt`.
- `comments` gắn với các post đó chuyển thành `content_items` (`kind = comment` hoặc `reply`, `parent_id` trỏ tới post).
- `sources` và `authors` được tạo từ metadata (group/page, tác giả).
- Không chuyển: `document_parts`, `chunks`, `terms`, `document_terms`, digest. Phân tích sẽ chạy lại trên pipeline mới.
- Export bảng cũ ra file trước khi drop.
