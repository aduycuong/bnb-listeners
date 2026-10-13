# Plan

Kế hoạch xây dựng lại theo hướng social listening. Mỗi giai đoạn có kết quả kiểm chứng được. Thứ tự và chi tiết sẽ được điều chỉnh khi triển khai.

Tham chiếu: [overview.md](overview.md), [data-model.md](data-model.md), [synthetic-data.md](synthetic-data.md).

## Giai đoạn 0 — Chuẩn bị

- [x] Chuyển docs cũ vào `docs/deprecated/`
- [x] Viết tài liệu mô hình dữ liệu và kế hoạch
- [x] Export `documents`, `comments` và `data_sources` ra JSONL (`npm run legacy:export`). Lần export 2026-10-11: 5 data source, 1.918 documents, 9.707 comments.
- [x] Đóng băng code cũ: tắt data source và system schedule, xóa schedule QStash (`npm run legacy:freeze`). Xem [D1](decisions.md#d1--đóng-băng-pipeline-cũ-2026-10-11)
- [x] Workflow engine: Upstash Workflow. Xem [D2](decisions.md#d2--workflow-engine-upstash-workflow-2026-10-11)
- [x] Namespace module mới. Xem [D3](decisions.md#d3--module-mới-phẳng-tên-mới-2026-10-11)

**Kết quả:** quyết định được ghi ở [decisions.md](decisions.md), dữ liệu cũ đã được sao lưu vào `.local/exports/` (không commit).

## Giai đoạn 1 — Kho thô (L0 + L1)

- [x] Cài `@upstash/workflow`, dựng route workflow và bước mẫu (`/api/workflows/ping`, `npm run workflow:trigger -- --name ping`)
- [x] Schema `sources`, `authors`, `content_items`, `engagement_snapshots`, `collect_runs` (cột `origin` có từ giai đoạn này; `scenario_id` để giai đoạn 2)
- [x] Interface connector chung (`lib/connectors/types.ts`: chế độ `job` và `direct`)
- [x] Connector Facebook (page/group, post + comment), viết lại trên nền tích hợp Bright Data và webhook hiện có. Lưu payload gốc lên R2. Xem [D6](decisions.md#d6--luồng-collect-chỉ-dùng-webhook-2026-10-11)
- [x] Lấy dữ liệu tăng dần theo `since`, bỏ giới hạn cố định 10 bài mỗi lần (`npm run collect:facebook`)
- [x] Script chuyển `documents` + `comments` cũ sang `content_items` (`origin = legacy_import`, `npm run legacy:import`)

**Kết quả:** dữ liệu Facebook thật và dữ liệu cũ nằm trong kho thô mới.

Kiểm chứng sau khi chạy migration:
1. `npm run legacy:import -- --yes`: 1.293 post, 9.707 comment (gồm reply), 5 source.
2. `npm run collect:facebook -- --url <group> --limit 20 --yes`: một `collect_runs` chuyển sang `success`, `payload_key` trỏ tới `raw/facebook/facebook-posts/...` trên R2, sinh ra các run `facebook-comments` follow-up.

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
  3. Lấy comment: tối đa **100 dòng/bài**, không lấy reply (`get_all_replies = false`, config), sort "Most relevant". Lưu `comments_collected_count = num_comments` tại thời điểm lấy.

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
| Comment (lần đầu ≤ 100 dòng/bài, lấy lại khi tăng ≥ 15%) | ~500–1.000 |

Chi phí comment là con số ước lượng thô, cần đo lại sau một tuần chạy thật.

### Còn mở
- Giá trị mặc định của `monthly_record_limit`.
- Giới hạn đã biết: chỉ biết comment tăng tại các mốc; comment bị xóa không được phát hiện; với bài trên 100 comment, lần lấy lại "Most relevant" có thể không chứa comment mới. Bài có 1–100 comment chỉ được lấy comment từ mốc +24 giờ. Nếu job post bị cắt bởi `limit_multiple_results` thì phần bài cũ hơn bị sót.
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
- [ ] Schema `personas` (`attributes jsonb`, `version`), `persona_panels`, `persona_panel_members` (`weight`), cột `authors.persona_id`
- [ ] Script seed 8–10 persona và 3 panel mẫu cho BĐS (group review, cư dân dự án, nhà đầu tư)

**Bước 2 — Connector ảo**
- [ ] Connector `synthetic-threads` (`DirectConnector`): code lập kế hoạch, LLM viết từng thread, code ghép lại; ghi spec vào `content_items.metadata`
- [ ] `sources` giả (`origin = synthetic`, `platform = facebook`, `source_type = group`)
- [ ] Mẫu giọng văn: few-shot từ comment thật của source được chọn
- [ ] Chèn nhiễu nhẹ (bỏ dấu, lỗi chính tả, spam, ca trùng tên)
- [ ] `npm run synthetic:generate -- --panel … --source … --brief … --posts 10 --yes`
- [ ] Đo thời gian một run để chốt số thread mỗi run (rủi ro giới hạn thời gian của bước workflow)

**Bước 3 — Giao diện**
- [ ] Màn hình tạo persona, panel và chạy sinh (làm sau cùng, bước 1–2 chạy được bằng script)

**Kết quả:** từ một panel và một `brief`, sinh được post, comment và reply vào kho thô với `origin = synthetic`, truy vết được theo `collect_run_id` và persona.

**Để sau** (không làm trong giai đoạn này): bảng `scenarios`, `synthetic_labels` (dựng từ `metadata` khi cần đo Enrich ở giai đoạn 4), chế độ replay (giai đoạn 6), dự báo phản ứng và backtest, khai thác persona từ dữ liệu thật, quy tắc cô lập dữ liệu giả theo project.

## Giai đoạn 3 — Cấu hình project và Match (L2 + `mentions`)

- [ ] Schema `projects` (thêm `mode`), `project_entities`, `project_queries`, `project_aspects`, `project_sources`, `project_scenarios`
- [ ] Form cấu hình truy vấn, entity và aspect (theo `.cursor/rules/form-creation.mdc`)
- [ ] Chuẩn hóa tiếng Việt: bỏ dấu, alias, viết tắt
- [ ] Match tầng 1 (từ vựng) và tầng 2 (LLM cho ca mơ hồ)
- [ ] So khớp lại khi `project_queries.version` thay đổi

**Kết quả:** precision/recall của Match đo được trên dữ liệu giả.

## Giai đoạn 4 — Enrich

- [ ] Prompt structured output sinh từ cấu hình project
- [ ] Sentiment, emotion, aspect, entity; extraction riêng theo case `general` trước
- [ ] Chạy theo batch, cache theo `content_hash` + `config_version`
- [ ] Gom cụm topic và đặt tên
- [ ] Đánh giá với `synthetic_labels` và một bộ mẫu thật nhỏ có gán nhãn
- [ ] Cho phép người dùng sửa nhãn trên giao diện (`user_corrected`)

**Kết quả:** đạt ngưỡng chính xác được chấp nhận trên cả dữ liệu giả và mẫu thật.

## Giai đoạn 5 — Aggregate và dashboard

- [ ] `metrics_hourly`, `metrics_daily`, cập nhật tăng dần
- [ ] Công thức reach, NSS, SoV trong `lib/`
- [ ] API trả dữ liệu đúng shape mà dashboard demo đang dùng
- [ ] Nối dữ liệu thật vào các trang Overview, Mentions, Sentiment, Topics
- [ ] Sau đó: Channels, Authors và trang riêng theo case

**Kết quả:** một project `general` thật và một project sandbox chạy end-to-end.

## Giai đoạn 6 — Cảnh báo, insight, báo cáo

- [ ] `engagement_snapshots` định kỳ cho bài đang nóng
- [ ] Rule ngưỡng và phát hiện bất thường trên `metrics_hourly`
- [ ] Connector ảo chế độ replay để test cảnh báo
- [ ] Insight và báo cáo AI có trích dẫn mention
- [ ] Gửi thông báo (email trước, các kênh khác sau)

**Kết quả:** đo được độ trễ phát hiện trên scenario khủng hoảng.

## Giai đoạn 7 — Mở rộng nguồn

- [ ] TikTok, YouTube (có tìm theo từ khóa)
- [ ] Báo điện tử (RSS/Exa)
- [ ] Diễn đàn, trang rao vặt
- [ ] Gợi ý nguồn Facebook mới

## Giai đoạn 8 — Dọn dẹp

- [ ] Xóa pipeline cũ: `documents`, `document_parts`, `chunks`, `terms`, digest và code liên quan
- [ ] Cập nhật `.ai/database-schema.md` và `AGENTS.md`
- [ ] Xóa demo data khi mọi trang đã dùng dữ liệu thật

## Câu hỏi còn mở

- Kho thô dùng chung giữa các workspace (tiết kiệm chi phí cào) hay tách riêng theo workspace (dễ quản lý quyền)? Hiện đề xuất dùng chung.
- Ngưỡng chính xác tối thiểu để đưa số liệu cho khách hàng.
- Ngân sách LLM cho mỗi mention và hạn mức theo gói.
