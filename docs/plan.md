# Plan

Kế hoạch xây dựng lại theo hướng social listening. Mỗi giai đoạn có kết quả kiểm chứng được. Thứ tự và chi tiết sẽ được điều chỉnh khi triển khai.

Tham chiếu: [overview.md](overview.md), [database-schema.md](../.ai/database-schema.md), [synthetic-data.md](synthetic-data.md).

## Giai đoạn 0 — Chuẩn bị

- [x] Chuyển docs cũ vào `docs/deprecated/`
- [x] Viết tài liệu mô hình dữ liệu và kế hoạch
- [x] Export `documents`, `comments` và `data_sources` ra JSONL (`npm run legacy:export`). Lần export 2026-10-11: 5 data source, 1.918 documents, 9.707 comments.
- [x] Đóng băng code cũ: tắt data source và system schedule, xóa schedule QStash (`npm run legacy:freeze`). Xem [D1](decisions.md#d1--đóng-băng-pipeline-cũ-2026-10-11)
- [x] Workflow engine: Upstash Workflow. Xem [D2](decisions.md#d2--workflow-engine-upstash-workflow-2026-10-11)
- [x] Namespace module mới. Xem [D3](decisions.md#d3--module-mới-phẳng-tên-mới-2026-10-11)

**Kết quả:** quyết định được ghi ở [decisions.md](decisions.md), dữ liệu cũ đã được sao lưu vào `.local/exports/` (không commit).

## Giai đoạn 1 — Kho thô (L0 + L1)

- [x] Cài `@upstash/workflow`, dựng route workflow và bước mẫu (`/api/workflows/ping`, `npm run workflow:trigger -- -- --name ping`)
- [x] Schema `sources`, `authors`, `content_items`, `engagement_snapshots`, `collect_runs` (cột `origin` có từ giai đoạn này; `scenario_id` để giai đoạn 2)
- [x] Interface connector chung (`lib/connectors/types.ts`: chế độ `job` và `direct`)
- [x] Connector Facebook (page/group, post + comment), viết lại trên nền tích hợp Bright Data và webhook hiện có. Lưu payload gốc lên R2. Xem [D6](decisions.md#d6--luồng-collect-chỉ-dùng-webhook-2026-10-11)
- [x] Lấy dữ liệu tăng dần theo `since`, bỏ giới hạn cố định 10 bài mỗi lần (`npm run collect:facebook`)
- [x] Script chuyển `documents` + `comments` cũ sang `content_items` (`origin = legacy_import`, `npm run legacy:import`)

**Kết quả:** dữ liệu Facebook thật và dữ liệu cũ nằm trong kho thô mới.

Kiểm chứng sau khi chạy migration:
1. `npm run legacy:import -- -- --yes`: 1.293 post, 9.707 comment (gồm reply), 5 source.
2. `npm run collect:facebook -- -- --url <group> --limit 20 --yes`: một `collect_runs` chuyển sang `success`, `payload_key` trỏ tới `raw/facebook/facebook-posts/...` trên R2, sinh ra các run `facebook-comments` follow-up.

## Giai đoạn 1 — Phát sinh: lập lịch thu thập, tier và lấy lại comment

Phát sinh sau khi chạy thử Giai đoạn 1: kho thô chưa tự cập nhật (chỉ chạy tay bằng script), và một lần lấy comment ngay sau khi có bài là chưa đủ. **Đã rà lại sau thử nghiệm ngày 2026-10-12.**

### Kết quả thử nghiệm Bright Data (2026-10-12)

Script `npm run probe:bright-data` (`scripts/probe-bright-data-facebook.ts`), kết quả lưu ở `.local/experiments/`. Bright Data tính tiền theo bản ghi được giao về (khoảng $1.5 / 1.000 bản ghi).

- `posts_to_not_include` hoạt động, nhưng id bị loại vẫn chiếm chỗ trong `num_of_posts`. **Không dùng.**
- Không truyền ngày và `num_of_posts` thì số bài trả về không bị chặn. `limit_multiple_results` chặn cứng tổng số bản ghi của job.
- `start_date` / `end_date` nhận `MM-DD-YYYY`, `YYYY-MM-DD` và ISO datetime. ISO datetime lọc chính xác tới giây và tôn trọng múi giờ (`Z`). Chỉ truyền `start_date` (không `end_date`, không `num_of_posts`) thì job tự dừng ở mốc đó: run 24 giờ trả 33 bài, chứa đủ 20 bài của một run trước đó. Khi có `num_of_posts`, job lấy các bài mới nhất trong khoảng.
- Ranh giới ngày khi chỉ truyền ngày (UTC hay giờ Việt Nam) chưa xác định được; dùng ISO datetime thì không cần biết.
- Dataset lấy post theo URL (`gd_lyclm1571iy3mv57zw`) kèm 3 comment nổi bật nhưng không có comment id, nên chỉ dùng để xem trước (`metadata.topComments`).
- `limit_records` của dataset comment tính theo từng bài và đếm cả reply. `num_comments` cũng đếm cả reply. Số comment lấy được có thể ít hơn `num_comments` (158 so với 139).
- `comments_sort` "Most relevant" và "All comments" trả cùng tập comment gốc trên bài thử. Một lần lấy comment bị thiếu (24 so với 94 comment gốc ở lần lấy lại) do Bright Data dừng sớm; run comment ghi `posts[]` (`numComments`, `collected`, `replies`) vào stats để soát lại các lần lấy thiếu.
- `get_all_replies = false` bỏ hẳn reply (0 reply trên 264 dòng), và khi đó `limit_records` chỉ đếm comment gốc (`limit_records = 20` trả đúng 20 comment gốc). Ở 2 bài thử, reply chiếm khoảng 1/3 tổng số comment.
- Group `reviewbatdongsanaz` có khoảng 30–35 bài/ngày, gần như không có bài từ 21 giờ tới 6 giờ sáng (giờ Việt Nam). Trung vị 5 comment/bài, trung bình 20, khoảng 30% bài không có comment (đo khi bài mới 0–5 giờ tuổi).

### Đã quyết định

**Run post theo tier**
- `start_date` = `published_at` của bài mới nhất đã có trong kho − khoảng chồng lấn (2 giờ, config), dạng ISO. Không truyền `end_date` và `num_of_posts`. Source chưa có bài thì lấy lùi 1 ngày (config).
- Bài trùng trong phần chồng lấn được bỏ qua, không cập nhật engagement. Chỉ `facebook-post-refresh` cập nhật engagement của bài đã có, để ngưỡng lấy comment chỉ dựa trên một nguồn.
- Ghi vào `collect_runs.stats` số bài đến muộn (`lateArrivals`: bài mới vào kho có `published_at` cũ hơn bài mới nhất trước run) và độ trễ lớn nhất (`maxLatenessMinutes`). Sau 1–2 tuần chạy thật, dùng số này để chỉnh khoảng chồng lấn.
- Không kiểm tra hay lấy bù phần sót: `since` luôn tính từ bài đã có, nên run kế tiếp tự nối tiếp.
- Run post không tạo follow-up comment nữa.
- Tần suất: `hot` 2 giờ, `normal` 6 giờ, `low` 24 giờ, `paused` không quét.
- Tier tự tính sau mỗi run post theo số bài/ngày trong 7 ngày: `hot` ≥ 30, `normal` ≥ 3, còn lại `low`. Cột `sources.activity_tier_locked` để ghim tier bằng tay.

**Lấy lại comment theo lịch từng bài**
- Bảng mới `item_refresh_schedules` (`content_item_id`, `next_refresh_at`, `checkpoint_hours`, `comments_collected_count`, `comments_collected_at`). Dòng bị xóa khi bài hết các mốc.
- Mốc: +6 giờ, +24 giờ, +72 giờ tính từ `published_at` (danh sách mốc là config).
- Lúc run post thêm bài vào kho, `num_comments` vừa lấy được dùng để áp luật lấy comment ngay (như một mốc 0), rồi tạo lịch cho mốc kế tiếp còn ở tương lai. Bài đã qua hết các mốc thì không tạo lịch.
- Tại mỗi mốc:
  1. Chạy connector `facebook-post-refresh` để đọc lại `num_comments` (1 bản ghi/bài, gom theo source; lưu `topComments`). Mốc đã giao cho run refresh được đẩy lùi 3 giờ để không bị gửi lại.
  2. Lấy comment khi:
     - chưa lấy lần nào và `num_comments > 100`, hoặc
     - chưa lấy lần nào, `num_comments > 0` và bài đã đăng quá 1 ngày, hoặc
     - đã lấy rồi và `num_comments` tăng ≥ 15% so với `comments_collected_count`. Không kèm mức tối thiểu tuyệt đối: bài ít comment có tăng phần trăm lớn thì lấy lại cũng chỉ tốn vài bản ghi.

     Các ngưỡng 100, 1 ngày, 15% là config.
  3. Lấy comment: tối đa **150 dòng/bài**, lấy cả reply (`get_all_replies = true`, config), sort "Most relevant". Lưu `comments_collected_count = num_comments` tại thời điểm lấy. Đổi ngày 2026-10-14, xem [D9](decisions.md#d9--lấy-reply-và-định-danh-tác-giả-comment-2026-10-14).

**Usage**
- `sources.monthly_record_limit` (null = không giới hạn). Usage tháng = tổng `collect_runs.item_count` của mọi run thuộc source.
- Hết ngân sách thì không lên lịch. Mỗi job gửi `limit_multiple_results` bằng ngân sách còn lại; với run post đây cũng là chốt chặn khi job không dừng ở `start_date`.
- Bảng ghi usage chi tiết, quy đổi tiền, hạn mức theo workspace: PR riêng.

**Bộ lập lịch**
- Một QStash schedule 15 phút một lần gọi workflow `schedule-collections`: chọn source đến hạn (theo tier, không có run post đang chạy, còn ngân sách) và các mốc lấy lại đến hạn.
- Source chỉ vào lịch sau run post đầu tiên chạy tay (`npm run collect:facebook`). Đặt tier `paused` để dừng.
- Script `npm run schedules:sync` tạo, cập nhật hoặc xóa (`--remove`) schedule; không có `--yes` thì xem trước lần chạy kế tiếp.

### Ước tính chi phí cho một group `hot` (~35 bài/ngày)

| Hạng mục | Bản ghi/ngày |
|---|---|
| Run post: bài mới + chồng lấn 2 giờ (bài trùng vẫn bị tính tiền), 12 run | ~70 |
| Lấy lại post theo URL (3 mốc, trừ bài vừa có trong run post) | ≤ 105 |
| Comment kèm reply (lần đầu ≤ 150 dòng/bài, lấy lại khi tăng ≥ 15%) | ~750–1.500 |

Chi phí comment là con số ước lượng thô, cần đo lại sau một tuần chạy thật.

### Còn mở
- Giá trị mặc định của `monthly_record_limit`.
- Giới hạn đã biết: chỉ biết comment tăng tại các mốc; comment bị xóa không được phát hiện; với bài trên 150 dòng comment và reply, lần lấy lại "Most relevant" có thể không chứa comment mới. Bài có 1–100 comment chỉ được lấy comment từ mốc +24 giờ. Nếu job post bị cắt bởi `limit_multiple_results` thì phần bài cũ hơn bị sót.
- Chưa kiểm chứng: bài ghim hoặc bài cũ có hoạt động mới có làm job post dừng sớm hay không.

### Việc cần làm
- [x] Schema: `sources.activity_tier_locked`, `sources.monthly_record_limit`, bảng `item_refresh_schedules`
- [x] Config tập trung (`lib/connectors/config.ts`)
- [x] Run post: `start_date` ISO từ bài mới nhất − chồng lấn, bỏ `num_of_posts`, bỏ qua bài đã có, ghi `lateArrivals`, bỏ follow-up comment, tạo lịch cho bài mới, tính lại tier
- [x] Connector `facebook-post-refresh` và `metadata.topComments`
- [x] Xử lý mốc lấy lại và ngưỡng comment; chạy tay bằng `npm run refresh:check`
- [x] Chặn usage theo `monthly_record_limit`: hết ngân sách thì không lên lịch run post và run refresh; run post gửi `limit_multiple_results` = min(500, ngân sách còn lại). Run comment chưa bị chặn theo ngân sách còn lại.
- [x] Workflow `schedule-collections` và script `schedules:sync`
- [x] Ghi [D7](decisions.md#d7--lập-lịch-thu-thập-tier-và-lấy-lại-comment-2026-10-13) vào `decisions.md`

## Giai đoạn 2 — Dữ liệu giả (persona → connector ảo → kho thô)

Mục tiêu thu hẹp: có dữ liệu post và comment nằm trong kho thô để các giai đoạn sau chạy tiếp. Dữ liệu giả và dữ liệu thật được phép trộn lẫn. Persona ban đầu chỉ cần đủ dùng, sẽ nâng cấp sau khi mở rộng sources. Xem [synthetic-data.md](synthetic-data.md).

**Bước 1 — Persona và panel**
- [x] Schema `personas` (`attributes jsonb`, `version`), `persona_panels`, `persona_panel_members` (`weight`), cột `authors.persona_id`
- [x] Script seed 10 persona và 3 panel mẫu cho BĐS (group review, cư dân dự án, nhà đầu tư): `npm run synthetic:seed-personas`

**Bước 2 — Connector ảo**
- [x] Connector `synthetic-threads` (`DirectConnector`): code lập kế hoạch, LLM viết từng thread, code ghép lại; ghi spec vào `content_items.metadata`
- [x] `sources` giả (`origin = synthetic`, `platform = facebook`, `source_type = group`)
- [x] Mẫu giọng văn: few-shot từ comment thật của source được chọn (`--style-source`)
- [x] Chèn nhiễu nhẹ (bỏ dấu, lỗi chính tả, spam, ngoài chủ đề, ca trùng tên qua `--distractor`)
- [x] `npm run synthetic:generate -- -- --panel … --source … --brief … --posts 10 --yes`
- [x] Chạy thật lần 1 (2026-10-13): 10 thread, 68 item, 19,6s, không thread nào bị bỏ. Đã nâng `maxThreadsPerRun` lên 30 (ước lượng, cần đo lại)
- [x] Chỉnh sau khi đọc mẫu: OP giữ cảm xúc của bài, cấm bịa chi tiết, mức bám brief (`briefRelevance`), độ dài bài theo persona
- [ ] Chạy lại với `--style-source` (source thật) và đọc lại mẫu; chỉnh `lib/personas/config.ts` nếu văn bản vẫn đồng nhất
- [x] `npm run source:delete-content -- -- --source <id> [--origin synthetic] --yes` để dọn nội dung của một source
- [x] Seed lịch sử theo kịch bản (`npm run synthetic:seed-history -- -- --scenario <file>`): mỗi đoạn có brief, cửa sổ ngày trong quá khứ và số bài riêng, để báo cáo theo kỳ (tăng trưởng topic) có dữ liệu kỳ trước. Kịch bản đầu: `scripts/synthetic-scenarios/lavita-topic-history.json` (28 ngày, 93 bài, vào "Match eval BĐS giả")

**Bước 3 — Giao diện**
- [x] Màn hình trong admin console: `/admin/personas` (xem, tạo, sửa; sửa tăng `version`), `/admin/panels` (chọn persona và `weight`, hiển thị tỷ lệ), `/admin/generate` (form chạy sinh kèm bảng run gần đây). Chưa có xóa persona/panel và chưa có sinh persona bằng LLM
- [ ] Kiểm tay màn hình sau khi đăng nhập admin (đã kiểm: route compile, API trả 401 khi chưa đăng nhập)

**Kết quả:** từ một panel và một `brief`, sinh được post, comment và reply vào kho thô với `origin = synthetic`, truy vết được theo `collect_run_id` và persona.

**Để sau** (không làm trong giai đoạn này): bảng `scenarios`, chế độ replay (giai đoạn 6), dự báo phản ứng và backtest, khai thác persona từ dữ liệu thật, quy tắc cô lập dữ liệu giả theo project.

## Giai đoạn 3 — Cấu hình project và Match (L2 + `mentions`)

Case BĐS, thứ tự ưu tiên và cấu hình theo case: xem [D10](decisions.md#d10--giai-đoạn-3-case-bđs-và-cấu-hình-project-2026-10-14). Giai đoạn này làm thật 3 case `project`, `market`, `brand`.

**PR 1 — Cấu hình project**
- [x] Đổi `projects.case` sang id case BĐS; chuyển case cũ và đánh dấu project demo (`is_demo`). Script chuyển đã gỡ (D26)
- [x] Schema `projects` (thêm `mode`, `timezone`, `config_version`, `case_config`, `is_demo`), `project_entities`, `project_queries`, `project_aspects`, `project_sources` (`project_scenarios` chỉ thêm khi có `scenarios`, xem [D8](decisions.md#d8--giai-đoạn-2-persona--connector-ảo--kho-thô-2026-10-13))
- [x] Template entity, aspect và trường riêng cho `project`, `market`, `brand`
- [x] Wizard tạo project thật: case → thông tin → entity/khu vực và truy vấn → aspect → nguồn → cảnh báo & báo cáo → xem lại (theo `.cursor/rules/form-creation.mdc`)
- [x] Phiên bản case (`projects.case_version`, `CASE_VERSIONS`): project chạy ở phiên bản cũ, người dùng tự nâng cấp trong trang settings
- [x] Lưu cấu hình cảnh báo (`alert_rules`, `projects.notification_config`); đánh giá rule và gửi thông báo làm ở giai đoạn 6
- [x] Sửa cấu hình trong trang settings của project, tăng `config_version` và `project_queries.version`
- [x] Project thật (`is_demo = false`) không hiện dashboard số liệu mẫu
- [x] Kiểm tay wizard và trang settings sau khi chạy migration

**PR 2 — Match** (xem [D11](decisions.md#d11--giai-đoạn-3-match-2026-10-14))
- [x] Chuẩn hóa tiếng Việt: bỏ dấu, viết liền, alias ngắn/viết hoa khớp nguyên từ
- [x] Schema `mentions`, `match_judgments`, `project_queries.ambiguous`, `projects.match_signature`
- [x] Match tầng 1 (từ vựng) và tầng 2 (LLM theo thread, có cache) cho comment theo ngữ cảnh, khớp không dấu và tên dễ nhầm
- [x] So khớp lại khi chữ ký truy vấn/nguồn đổi (workflow `match-project`); so khớp tăng dần sau mỗi lần thu thập
- [x] Bước Nguồn trước bước Đối tượng; xem trước số khớp tầng 1 trong wizard và settings
- [x] `npm run match:project`
- [x] Chạy thử trên group thật (Vinhomes, 682 item trong 30 ngày): 20 item nhắc tên, 255 comment ngữ cảnh qua tầng 2 (10 lần gọi LLM), 182 được tính. Chạy lại dùng cache, không gọi LLM.
- [ ] Đo precision/recall trên mẫu thật gán nhãn tay (cùng đợt gán nhãn ở giai đoạn 4a). Dữ liệu giả không dùng để đo (D12).

**Kết quả:** tạo được project `project`, `market`, `brand` cho workspace với cấu hình thật; Match chạy trên dữ liệu thật và giả như nhau.

## Giai đoạn 4 — Enrich

Kiểm chứng chỉ trên mẫu thật gán nhãn tay (D12), nên trang Mentions làm trước. Chi tiết Enrich chốt khi bắt đầu 4b.

**4a — Trang Mentions và gán nhãn** (xem [D13](decisions.md#d13--nhãn-tay-và-đo-trên-mẫu-thật-2026-10-14))
- [x] Schema `item_labels`, `label_samples`, `label_sample_items`, `mentions.auto_is_relevant`
- [x] Trang Mentions: danh sách, lọc (liên quan, cách khớp, loại, đối tượng, nhãn, ngày, tìm chữ), xem thread
- [x] Sửa nhãn trên giao diện (`user_corrected`): có liên quan hay không; item bỏ sót thành mention `manual`. Sau 4b thêm sentiment, aspect
- [x] Đợt mẫu ngẫu nhiên phân tầng, gán nhãn từng item có phím tắt, ẩn quyết định của hệ thống
- [x] Precision/recall có trọng số: trên trang Mentions và `npm run eval:match`
- [ ] Gán nhãn một bộ mẫu thật (khoảng 150 item) và ghi kết quả đo Match

**4b — Enrich lõi** (xem [D14](decisions.md#d14--giai-đoạn-4b-enrich-2026-10-14))
- [x] Prompt structured output sinh từ cấu hình project và phiên bản case
- [x] Sentiment, emotion, aspect, entity; trích xuất `price_quote`, `buyer_question` (`project`), `price_quote` theo khu vực (`market`)
- [x] Làm giàu theo thread; chữ ký Enrich để không làm giàu lại nội dung không đổi; workflow `enrich-project` sau Match
- [x] Trang Mentions hiện và cho sửa sentiment, aspect; mẫu `enrich` và màn hình gán nhãn; `npm run eval:enrich`
- [x] Chạy thật: Vinhomes 202 mention (16 lần gọi LLM, ~80 giây), sandbox 114 mention (18 lần gọi); chạy lại không gọi LLM
- [ ] Gán nhãn mẫu Enrich trên dữ liệu thật và ghi kết quả (ngưỡng: sentiment ≥ 80%, aspect F1 ≥ 0,7)

**4c — Topic** (xem [D15](decisions.md#d15--giai-đoạn-4c-topic-2026-10-15))
- [x] Schema `topics`, `mention_topics`, `mention_embeddings`, `mentions.topic_hint`, `mentions.topic_status`
- [x] Enrich prompt v4 trả `topic_hint`
- [x] Embed `topic_hint`; LLM gán hint vào topic cũ hoặc topic mới; gộp topic gần nhau
- [x] Workflow `topic-project` sau `enrich-project`; `npm run topics:project`
- [x] Trang Topics cho project thật: danh sách, đổi tên, sửa mô tả, ẩn/hiện, gộp; lọc theo topic trên trang Mentions
- [x] Chạy thật trên Vinhomes (2026-10-15). Lần 1 gom bằng embedding: topic bị tên khu chi phối, chuyển sang LLM (D15). Lần cuối (`gpt-4.1`, 2 lần gọi, ~9 giây): 6 topic cụ thể ("Dự án mang danh châu Âu nhưng không giống" 17, "Giá bán không hợp lý hoặc ảo" 13, "Giá thứ cấp giảm, cắt lỗ" 10, …), 59/187 mention có hint được gán; phần còn lại chung chung hoặc lẻ, chờ các lần chạy sau. `gpt-4.1-mini` gán nhiều hơn nhưng tạo topic rộng như aspect.
- [ ] Theo dõi độ phủ và chất lượng topic sau 1–2 tuần chạy theo lịch; sandbox không dùng để đánh giá vì dữ liệu giả sinh theo aspect
- [ ] Mẫu `topic` và đo tỉ lệ gán đúng topic

**Kết quả:** đạt ngưỡng chính xác được chấp nhận trên mẫu thật gán nhãn.

## Giai đoạn 5 — Aggregate và dashboard

Làm trang Topics trước: đây là trang đã có dữ liệu thật đầy đủ nhất (giai đoạn 4c), nên dùng để chốt cách tổ chức L4 và API cho các trang còn lại.

### 5a — Topics (xong 2026-10-15)
- [x] Route: `/p/[i]/topics` là trang báo cáo như demo; trang quản lý hiện tại (sửa tên/mô tả, ẩn/hiện, gộp, xem mention) chuyển sang `/p/[i]/topics/manage`. Sidebar giữ một mục "Topics"; trang báo cáo có nút "Quản lý topic" (quyền `edit`). Không đưa vào Settings vì topic là dữ liệu hệ thống sinh ra, không phải cấu hình.
- [x] Trang báo cáo bám demo (demo đã được duyệt): đám mây từ khóa, biểu đồ tăng trưởng chủ đề (thanh ngang % tăng trưởng mỗi topic như `GrowthChart` của demo, không phải biểu đồ theo ngày), bảng chủ đề (đề cập, tăng trưởng, % tích cực, % tiêu cực). Bấm một chủ đề mở Mentions lọc theo topic. Topic chưa có số của kỳ trước hiện "mới" và không vào biểu đồ.
- [x] Một khoảng thời gian dùng chung cho cả trang, chọn ở header (cùng các kỳ 7/14/30 ngày với các report khác, `METRICS_CONFIG.reportPeriodDays`). Số đề cập và tỷ lệ cảm xúc tính trong khoảng đó; tăng trưởng so với cùng số ngày liền trước. Khoảng trượt tính từ lúc xem, theo `published_at`. Trang quản lý giữ 7 so với 7.
- [x] Bản đầu đọc thẳng từ `mention_topics` (`GET /api/topics/report`); chuyển sang L4 (`topic_metrics_daily`) khi dữ liệu lớn mà giao diện giữ nguyên.
- [x] Từ khóa ([D16](decisions.md#d16--từ-khóa-2026-10-15)): Enrich v5 trả `keywords`, lưu ở `mention_keywords`, đám mây từ khóa đếm theo kỳ báo cáo thay dữ liệu mẫu.
- [x] Enrich lại toàn bộ mention theo v5 sau khi chạy migration `mention_keywords` (Sandbox 635/652 mention có từ khóa, Vinhomes 173/202).
- [x] Seed lịch sử 28 ngày cho Sandbox (`npm run synthetic:seed-history`) để biểu đồ tăng trưởng có kỳ trước; sửa topic trùng tên và tên topic chứa tên dự án (PR #24, #25).
- [x] Từ khóa chung chung (D16, prompt v7): prompt chỉ lấy điều văn bản thực sự nhắc tới, không lấy tên khía cạnh, từ chung về bất động sản hay con số; code bỏ thêm `ENRICH_CONFIG.genericKeywords`, tên khía cạnh của project và từ khóa bắt đầu bằng chữ số. Enrich lại toàn bộ (2026-10-15). Trước: Sandbox đứng đầu "tiện ích" 132, "vị trí" 110, "pháp lý" 106, "giá" 100; Vinhomes "giá bán", "giá", "vị trí". Sau (7 ngày): Sandbox "công viên" 19, "sổ hồng" 17, "giao thông" 16, "chất lượng xây dựng" 15, "hồ bơi" 15; Vinhomes "kiến trúc", "Mizuki", "nguồn cung", "tường nứt" 3, "cắt lỗ", "ngập", "phí dịch vụ" 2. Vinhomes còn 92/202 mention có từ khóa (trước 173), vì bình luận ngắn không còn bị gán "giá", "vị trí".

**Kết quả 5a:** trang báo cáo Topics bám demo chạy trên dữ liệu thật (Vinhomes) và sandbox có 2 kỳ (Lavita).

### 5b — Các trang còn lại

Xem [D17](decisions.md#d17--giai-đoạn-5b-số-liệu-dashboard-2026-10-15).

**PR 1 — Overview + Sentiment**
- [x] `lib/metrics/`: công thức NSS, tỉ lệ, tăng trưởng, SoV, tương tác; kỳ báo cáo theo ngày trọn và múi giờ project
- [x] `GET /api/metrics/overview`, `GET /api/metrics/sentiment`, đọc thẳng L3; chưa làm `metrics_daily` (D17), `metrics_hourly` chuyển sang giai đoạn 6
- [x] Overview cho project thật: 6 KPI (đề cập, tương tác, tác giả, NSS, SoV, tỉ lệ tiêu cực) so với kỳ trước, đề cập theo ngày và cảm xúc, phân bổ cảm xúc, kênh theo nguồn, chủ đề nổi bật. Reach bỏ, thay bằng tương tác
- [x] Sentiment cho project thật: NSS theo ngày, cảm xúc chi tiết, cảm xúc theo khía cạnh
- [x] Chart demo nhận nhãn ngày và tên khía cạnh thật
- [x] Kiểm trên Sandbox Lavita (14 và 30 ngày) và Vinhomes (chưa có kỳ trước)

**PR 2 — Channels + Authors**
- [x] Channels cho project thật, giữ bố cục demo: tỷ trọng và cảm xúc theo kênh (nền tảng, group Facebook tách khỏi page), bản đồ nhiệt giờ × thứ theo múi giờ project, nguồn ảnh hưởng nhất (bài, đề cập, tương tác; bấm mở Mentions lọc theo nguồn)
- [x] Authors cho project thật: tác giả xếp theo tổng tương tác của các đề cập trong kỳ, cơ cấu tác giả theo nhóm của demo (`AUTHOR_TIERS`)
- [x] Trang Mentions lọc theo `authorId` và `sourceId` từ URL
- [ ] Phân loại tác giả (`authors.author_type`, KOL, báo chí/thương hiệu) và lấy số người theo dõi: task riêng. Hiện tác giả chưa có số người theo dõi được tính là người dùng thường

**Sau đó**
- [ ] Trang riêng theo case: đã có `project` (Chi tiết dự án) và `brand` (Chỉ số uy tín, D26); còn `market`
- [ ] `metrics_daily` khi dữ liệu lớn

**Kết quả giai đoạn 5:** một project `general` thật và một project sandbox chạy end-to-end.

## Giai đoạn 6 — Cảnh báo, insight, báo cáo

- [x] Đánh giá `alert_rules` mỗi giờ trên L3 (ngưỡng, tăng trưởng, bài lan rộng, từ khóa, giá, câu hỏi). Chưa `metrics_hourly`, chưa phát hiện bất thường ngoài các ngưỡng đã cấu hình
- [ ] `engagement_snapshots` định kỳ cho bài đang nóng
- [ ] Connector ảo chế độ replay để test cảnh báo
- [ ] Insight và báo cáo AI có trích dẫn mention (PR 5 bên dưới)
- [x] Gửi cảnh báo qua email (Resend). Zalo, SMS, Slack chưa gửi

**Kết quả:** đo được độ trễ phát hiện trên scenario khủng hoảng.

### MCP và báo cáo AI theo kỳ

Xem [D27](decisions.md#d27--mcp-và-scope-của-api-key-2026-10-26) và [D28](decisions.md#d28--kỳ-báo-cáo-và-l4-theo-ngày-2026-10-26). PR 4 làm song song được với PR 3.

**PR 1 — Kỳ báo cáo + MCP đọc** (3–4 ngày)
- [x] Resolve kỳ cuộn, kỳ lịch và kỳ tùy chọn theo timezone project (`resolveReportWindow`, `periodSql`); service metrics và báo cáo Chủ đề nhận `period` thay cho `days`, kết quả trả `period` (ngày đầu, ngày cuối, kỳ so sánh). Route dashboard vẫn nhận `?days=`
- [x] `lib/ai-tools/`: `list_projects`, `get_project`, `get_overview`, `get_sentiment`, `get_channels`, `get_authors`, `get_topics`, `get_case_metrics`, `search_mentions`
- [x] `/api/mcp` Bearer key qua Unkey (stateless, JSON response); đã chạy cả 9 tool qua client MCP in-memory trên DB dev
- [ ] Thử qua HTTP bằng key thật với chat agent

**PR 2 — Scope key + trang Kết nối AI** (1,5–2 ngày)
- [x] `workspace_api_keys`: `scopes`, `project_ids`, `created_by`; `/api/mcp` kiểm key qua `authorizeWorkspaceKey` (người tạo còn trong workspace, key cũ chạy với quyền chủ workspace), chỉ đăng ký tool trong scope, tool kiểm project
- [x] Thẻ API key ở workspace settings: tạo, sửa tên, scope, project (`PATCH /api/workspace-keys/[keyId]`), thu hồi
- [x] Mục **Kết nối AI** trong nhóm menu Dự án (`/p/[projectIndex]/connect`): địa chỉ MCP, id project, cấu hình mẫu (HTTP, Claude Code, Claude Desktop), key dùng được cho project, tạo key chỉ đọc cho project
- [x] Chạy migration (`0058`), kiểm tay trang Kết nối AI và thẻ API key: tạo key giới hạn scope và project, gọi `/api/mcp` qua HTTP, sửa scope có hiệu lực ngay, thu hồi trả 401

**PR 3 — MCP tạo project** (2–3 ngày)
- [x] `list_case_templates`, `list_sources`, `preview_project_match`, `create_project` (cùng schema với wizard, `dryRun` mặc định true), scope `projects:write` mở trong form key; kiểm in-memory trên DB dev: dry run, thiếu vai trò, trùng tên, `caseConfig` sai, key giới hạn project
- [ ] Tạo thật (`dryRun: false`) qua chat agent

**PR 4 — L4 theo ngày** (3–4 ngày)
- [x] `project_metrics_daily` (theo nguồn, cột SoV thay cho chiều entity), `project_aspect_daily`
- [x] Tính lại theo (project, ngày): cuối mỗi lần Enrich, khi sửa nhãn tay, sau match lại toàn bộ; `npm run metrics:refresh`
- [x] Tổng quan, Cảm xúc, Kênh đọc L4 (tác giả, bản đồ nhiệt, chủ đề, trang case vẫn đọc L3), giao diện không đổi
- [x] Chạy migration (`0059`), backfill (4 project, mỗi project dưới 0,3 giây), so số Tổng quan, Cảm xúc, Kênh với bản đọc L3 trên DB dev (4 project × 5 kỳ): khớp; chạy lại và chạy song song giữ nguyên tổng
- [x] Thay job đêm bằng sự kiện: lần thu thập chỉ cập nhật item (tương tác) tính lại ngày của các item đó; đổi vai trò đối tượng tính lại cả project. Kiểm trên DB dev: làm hỏng `engagement` của ngày một run làm mới, bước mới trả về đúng số
- [x] `REPORT_SCHEDULES` thêm `yearly`

**PR 5 — Báo cáo AI theo kỳ** (xem [D29](decisions.md#d29--báo-cáo-ai-theo-kỳ-2026-10-26))

5a — bộ sinh và MCP (2,5–3 ngày)
- [x] Kỳ `day` trong kỳ lịch
- [x] `ai_reports` (migration `0060`): snapshot số liệu, các phần, trích dẫn đề cập, model, token, chi phí, cảnh báo
- [x] Sinh báo cáo: snapshot, đề cập mẫu, LLM viết từng phần có trích dẫn, kiểm con số; `npm run reports:generate`. Thử trên DB dev: tuần, ngày, tháng đang chạy, project không có đề cập; 5–9 giây, $0,01–0,03 mỗi báo cáo
- [x] Tool `list_reports`, `get_report`

5b — giao diện (2–3 ngày)
- [x] Trang Báo cáo AI cho project thật: báo cáo đang chọn (`?report=`), danh sách báo cáo đã tạo bên dưới, dẫn chứng mở rộng được kèm link bài gốc, tạo lại, tạo cho kỳ lịch bất kỳ (quyền `edit`); `GET/POST /api/reports`, `GET /api/reports/[id]`
- [x] AI tóm tắt ở Tổng quan hiện điểm nổi bật của báo cáo mới nhất, link sang báo cáo; ô hỏi AI giữ chỗ cho khung chat

5c — lịch (1 ngày)
- [x] Job `generate-due-reports` mỗi giờ theo `reportSchedule`: một job `generate-report` cho mỗi báo cáo đến hạn, flow control 2; `npm run reports:due`
- [ ] Tạo schedule QStash `system-generate-due-reports` (mỗi giờ) sau khi deploy: `npm run schedules:jobs -- -- --yes` (danh sách schedule job ở `lib/qstash/system-schedules.ts`)

## Giai đoạn 7 — Mở rộng nguồn

- [x] TikTok qua TikHub: kênh, tìm từ khóa, bình luận, reply, làm mới video (xem [D19](decisions.md#d19--tiktok-qua-tikhub-2026-10-22)); `npm run collect:tiktok`
  - [ ] Chạy workflow `collect-source` end to end cho TikTok (DB, QStash, tunnel) và đối chiếu số bài với trang TikTok
  - [ ] Đo kích thước lô tối đa của `fetch_multi_video` và giới hạn thời gian một bước workflow
  - [ ] Ngân sách theo request (hiện `monthly_record_limit` đếm bản ghi)
  - [ ] Sau 1–2 tuần chạy lịch: độ phủ của nguồn tìm từ khóa (số bài mới mỗi run, `stats.requests`), chỉnh `pagesPerRun` và `intervalHours`
  - [ ] Nâng tác giả xuất hiện nhiều ở nguồn tìm kiếm thành nguồn kênh (xử lý bài đã thuộc nguồn search)
- [x] Transcript video TikTok từ phụ đề tự tạo, dùng cho Match và Enrich (xem [D21](decisions.md#d21--transcript-video-tiktok-2026-10-22)); `npm run backfill:tiktok-transcripts`
  - [x] Sửa tên bị nhận dạng giọng nói viết sai bằng LLM theo tên và alias đối tượng (xem [D22](decisions.md#d22--sửa-transcript-bằng-llm-theo-tên-đối-tượng-2026-10-22)); `npm run transcripts:correct`
  - [ ] Tự sửa lại transcript khi project đổi đối tượng hay alias
  - [ ] Video không có phụ đề: nghe audio bằng mô hình cho video đã khớp hoặc nhiều tương tác
  - [ ] Hiển thị transcript ở màn hình gán nhãn và danh sách mention
- [ ] YouTube (có tìm theo từ khóa)
- [ ] Báo điện tử (RSS/Exa)
- [ ] Diễn đàn, trang rao vặt
- [ ] Gợi ý nguồn Facebook mới

## Giai đoạn 8 — Dọn dẹp

Xem [D24](decisions.md#d24--gỡ-pipeline-cũ-2026-10-25).

- [x] PR 1: gỡ code, UI, route, script và job QStash của pipeline cũ (`documents`, `comments`, `chunks`, `terms`, digest, research, data source, system schedule, MCP, import dữ liệu cũ). Chưa đụng schema.
- [x] PR 2: xóa các bảng cũ và cột `projects.auto_create_terms`, `term_language`, `term_criteria` khỏi `db/schema.ts`, cập nhật `.ai/database-schema.md` và `AGENTS.md`. Migration do người dùng chạy (`db:generate`, `db:migrate`)
- [x] Dọn khóa i18n của pipeline cũ, `EXA_API_KEY` và 13 dependency không còn dùng (`@langchain/langgraph`, `@langchain/textsplitters`, `@modelcontextprotocol/sdk`, `react-markdown`, `remark-gfm`, `sonner`, 7 gói `@radix-ui/*`)
- [ ] Xóa demo data khi mọi trang đã dùng dữ liệu thật

## Câu hỏi còn mở

- Kho thô dùng chung giữa các workspace (tiết kiệm chi phí cào) hay tách riêng theo workspace (dễ quản lý quyền)? Hiện đề xuất dùng chung.
- Ngưỡng chính xác tối thiểu để đưa số liệu cho khách hàng.
- Ngân sách LLM cho mỗi mention và hạn mức theo gói.
