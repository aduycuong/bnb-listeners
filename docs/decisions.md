# Decisions

Các quyết định đã chốt cho bản xây dựng lại. Ghi thêm khi có quyết định mới; nếu đổi ý thì sửa mục cũ và ghi ngày đổi.

## D1 — Đóng băng pipeline cũ (2026-10-11)

- Không xóa code cũ cho đến giai đoạn 8. Tắt mọi data source và system schedule trong DB, đồng thời xóa schedule tương ứng trên QStash.
- Các job cào comment đã xếp lịch sẽ tự bỏ qua khi data source bị tắt (`scrape-facebook-document-comments`).
- Công cụ:
  - `npm run legacy:freeze -- --dry-run | --yes`
  - Danh sách đã tắt được lưu ở `.local/exports/frozen-*.json`. Muốn mở lại thì bật `enabled` rồi chạy `scripts/sync-system-schedules.ts`.
- Dữ liệu cũ đã được export ra `.local/exports/legacy-*/` (JSONL) bằng `npm run legacy:export`.
- **Lý do:** script chuyển dữ liệu cũ vẫn cần đọc bảng cũ; UI demo vẫn đang dùng; tránh phải gỡ code nhiều chỗ cùng lúc.

## D2 — Workflow engine: Upstash Workflow (2026-10-11)

- Pipeline mới (Collect → Normalize → Match → Enrich → Aggregate) chạy bằng Upstash Workflow (`@upstash/workflow`) trên QStash hiện có.
- Mỗi bước là một step idempotent; trạng thái nghiệp vụ (run, version) vẫn lưu trong DB.
- **Lý do:** không thêm hạ tầng hay tài khoản mới, tận dụng token và signing key QStash đang có, mà vẫn có retry và workflow nhiều bước bền vững.

## D3 — Module mới: phẳng, tên mới (2026-10-11)

Module mới nằm trực tiếp trong `lib/` theo `.cursor/rules/lib-services.mdc`, không trùng tên module cũ:

| Module | Lớp |
|---|---|
| `lib/connectors/` | Collect: interface chung, connector Facebook, connector ảo |
| `lib/raw-store/` | L1: sources, authors, content items, engagement snapshots |
| `lib/personas/` | Dữ liệu giả: persona, panel, kế hoạch và prompt sinh thread (đổi từ `lib/scenarios/`, xem D8) |
| `lib/project-config/` | L2: entity, query, aspect, nguồn của project |
| `lib/matching/` | Match: chuẩn hóa tiếng Việt, so khớp |
| `lib/mentions/` | L3: mention và truy vấn drill-down |
| `lib/enrichment/` | Enrich: prompt, batch LLM, đánh giá |
| `lib/topics/` | Gom cụm và đặt tên topic |
| `lib/metrics/` | L4: rollup và công thức (reach, NSS, SoV) |
| `lib/alerts/`, `lib/insights/`, `lib/reports/` | L5 |
| `lib/legacy-import/` | Chuyển `documents` + `comments` cũ sang kho thô |
| `lib/workflows/` | Hạ tầng Upstash Workflow: serve, trigger, notify. Định nghĩa workflow nằm ở `lib/{module}/workflows/`, route ở `app/api/workflows/{name}/` |

- `lib/projects/` được giữ và mở rộng (thêm `mode`). Danh sách trên có thể tách hoặc gộp khi triển khai.
- Các module cũ (`documents`, `comments`, `terms`, `scoring`, `classification`, `chunking`, `term-digests`, …) không được import vào module mới, trừ `lib/legacy-import/`.

## D4 — Docs (2026-10-11)

- Docs mới viết bằng tiếng Việt; tên bảng, cột và thuật ngữ kỹ thuật giữ tiếng Anh.
- Docs cũ nằm ở `docs/deprecated/`. `.ai/` và `.cursor/rules/` giữ nguyên.

## D5 — Dữ liệu giả chung bảng với dữ liệu thật (2026-10-11)

- Dùng chung bảng kho thô, phân biệt bằng `origin = synthetic`. Xem [synthetic-data.md](synthetic-data.md).
- ~~Gắn `scenario_id`; chỉ project `mode = sandbox` mới thấy.~~ Thay bằng D8 (2026-10-13): chưa có `scenario_id` và chưa cô lập theo project.

## D6 — Luồng collect: chỉ dùng webhook (2026-10-11)

- Mỗi lần thu thập là một dòng `collect_runs`, chạy bằng workflow `collect-source` (`lib/connectors/workflows/collect-source-workflow.ts`): start → chờ webhook → normalize theo batch 200 item → hook `after-normalize` của connector → finish → tạo run follow-up (đổi 2026-10-13, xem D7).
- Bright Data giao kết quả tới `/api/webhooks/connectors/bright-data/{collectRunId}` trên `NEXT_PUBLIC_APP_URL`. Route lưu nguyên payload vào kho payload (L0, hiện là R2) rồi `notify` workflow. Môi trường dev luôn chạy sau tunnel có domain công khai, nên không cần polling. Quá 6 giờ không có webhook thì run bị đánh dấu `failed`.
- `collect_runs.payload_key` là khóa object, không gắn với R2. Mọi lệnh đọc/ghi đi qua `rawPayloadStorage` (`lib/connectors/utils/raw-payload-storage.ts`), nên đổi kho lưu trữ chỉ cần sửa một chỗ.
- Workflow đọc payload theo khóa, không truyền payload qua QStash. Kết quả mỗi step chỉ là số đếm, nên giữ được nhỏ.
- ~~`since` lấy từ `published_at` mới nhất trừ 1 ngày; source mới lấy 30 ngày; `limit` 500.~~ Thay bằng D7 (2026-10-13).
- ~~Comment: sau mỗi batch post, post mới hoặc có `comment_count` tăng được gom thành run `facebook-comments`.~~ Thay bằng D7 (2026-10-13).
- Payload gốc có thông tin cá nhân. Bucket R2 hiện tại là public, nên production cần đặt `R2_RAW_BUCKET_NAME` trỏ tới một bucket private.
- **Lý do:** dùng lại đường webhook đã chạy ổn định và không bị giới hạn kích thước message QStash.

## D7 — Lập lịch thu thập, tier và lấy lại comment (2026-10-13)

Dựa trên các thử nghiệm Bright Data ngày 2026-10-12 và 2026-10-13 (`npm run probe:bright-data`, kết quả ở `.local/experiments/`, tóm tắt trong [plan.md](plan.md)). Các con số điều chỉnh được nằm ở `lib/connectors/config.ts`.

**Run post (`facebook-posts`)**
- `start_date` = `published_at` mới nhất của source − 2 giờ chồng lấn, dạng ISO datetime. Không gửi `num_of_posts` và `end_date`. Source chưa có bài thì lấy lùi 1 ngày.
- Mỗi job gửi `limit_multiple_results` = min(500, ngân sách tháng còn lại) làm chốt chặn.
- Bài đã có trong kho được bỏ qua, không cập nhật engagement (`onExisting: "skip"`). Chỉ `facebook-post-refresh` cập nhật engagement của bài đã có.
- Không kiểm tra hay lấy bù phần sót: `since` luôn tính từ bài đã có. Ghi `lateArrivals` / `maxLatenessMinutes` vào `collect_runs.stats` để chỉnh khoảng chồng lấn.
- Sau mỗi run: tính lại tier, áp luật lấy comment cho bài mới và tạo lịch lấy lại.
- **Lý do:** ISO datetime lọc chính xác tới giây; chỉ có `start_date` thì job tự dừng đúng mốc. Trước đây `posts_to_not_include` vẫn chiếm chỗ trong `num_of_posts`, và chồng lấn 1 ngày làm tốn tiền cho bài trùng.

**Tier và bộ lập lịch**
- Tier theo số bài/ngày trong 7 ngày (source mới tính trên khoảng đang có): `hot` ≥ 30 (quét 2 giờ), `normal` ≥ 3 (6 giờ), còn lại `low` (24 giờ). `paused` không quét; `activity_tier_locked` ghim tier.
- Workflow `schedule-collections` chạy 15 phút một lần (QStash schedule, `npm run schedules:sync`): tạo run post cho source đến hạn, rồi gửi các mốc lấy lại đến hạn.
- Chỉ source đã có ít nhất một run post mới được lên lịch; run đầu tiên chạy tay bằng `npm run collect:facebook`.
- **Lý do:** tránh tự quét các source nhập từ dữ liệu cũ; tần suất theo độ sôi động giữ chi phí tương xứng.

**Lấy comment**
- Lúc bài vào kho, `num_comments` vừa lấy được dùng để áp luật ngay. Sau đó tại các mốc +6 giờ, +24 giờ, +72 giờ tính từ `published_at`, connector `facebook-post-refresh` đọc lại bài theo URL (1 bản ghi/bài, lưu `metadata.topComments`) rồi áp luật. Bài đã qua hết các mốc thì không tạo lịch. Mốc đã giao cho run refresh được đẩy lùi 3 giờ để không bị gửi lại.
- Luật (bảng `item_refresh_schedules`):
  - chưa lấy lần nào và `num_comments > 100`;
  - chưa lấy lần nào, `num_comments > 0` và bài đã đăng ≥ 24 giờ;
  - đã lấy rồi và `num_comments` tăng ≥ 15% so với lần lấy trước (không có ngưỡng tuyệt đối).
- ~~Mỗi lần lấy tối đa 100 comment gốc, `get_all_replies = false`, sort "Most relevant".~~ Thay bằng D9 (2026-10-14): 150 dòng/bài, có reply.
- Run comment ghi `posts[]` (`numComments`, `collected`, `replies`) vào stats để soát các lần lấy thiếu; không tự lấy lại.
- **Lý do:** phần lớn bài ít comment chỉ cần lấy một lần ở mốc 24 giờ; bài nóng được lấy sớm. "Most relevant" và "All comments" trả cùng tập comment trên bài thử.

**Ngân sách**
- `sources.monthly_record_limit` (null = không giới hạn). Usage tháng = tổng `collect_runs.item_count` của mọi run thuộc source trong tháng (UTC). Hết ngân sách thì không lên lịch run post và run refresh. Run comment chưa bị chặn theo ngân sách còn lại.

**Công cụ**
- `npm run refresh:check`: gửi các mốc lấy lại đến hạn bằng tay.
- `npm run collect:renormalize -- --run-id <uuid>`: ghi lại payload đã lưu trên R2 vào kho thô (sau khi sửa parser) mà không tạo job Bright Data mới.

## D8 — Giai đoạn 2: persona → connector ảo → kho thô (2026-10-13)

Thu hẹp giai đoạn 2 thành một đường ống tạo dữ liệu. Chi tiết ở [synthetic-data.md](synthetic-data.md) và [plan.md](plan.md#giai-đoạn-2--dữ-liệu-giả-persona--connector-ảo--kho-thô).

**Quyết định**
- Mục tiêu: có post, comment, reply trong kho thô để các giai đoạn sau chạy tiếp. Dữ liệu giả và thật được phép trộn lẫn. Persona ban đầu không cần chính xác, nâng cấp dần sau khi mở rộng sources.
- Ba thực thể tách riêng: **persona** (kiểu người, dùng lại được), **panel** (tập persona kèm `weight`), **brief** (điều xảy ra, truyền vào mỗi lần sinh, nằm trong `collect_runs.params`).
- Persona dạng văn bản ngắn có cấu trúc, kèm `attributes jsonb` và `version` để mở rộng không cần migration. `authors.persona_id` cho tác giả giả nhất quán.
- Connector ảo là `DirectConnector` (`synthetic-threads`): code lập kế hoạch (số lượng, thời điểm, phân bổ persona), LLM viết từng thread, code ghép lại. Dùng chung workflow thu thập, nên **payload vẫn được lưu lên R2** và parse lại được bằng `collect:renormalize`. Đổi so với bản trước ghi "không có payload R2".
- Spec của từng item (`personaId`, `panelId`, `brief`, ý định cảm xúc) ghi vào `content_items.metadata`.
- Mẫu giọng văn: few-shot từ comment thật của source được chọn.
- Module `lib/personas/` thay cho `lib/scenarios/` (cập nhật D3).

**Hoãn lại**
- Bảng `scenarios`, `synthetic_labels` (dựng từ `metadata` khi đo Enrich ở giai đoạn 4), cột `scenario_id`, `project_scenarios`.
- Quy tắc cô lập dữ liệu giả theo project (`mode = sandbox`). Cột `origin` đủ để lọc khi cần.
- Chế độ replay (giai đoạn 6), snapshot engagement giả.
- Dự báo phản ứng cộng đồng, calibrate, backtest.

**Lý do**
- Kịch bản có nhãn đúng chỉ cần khi đo Match/Enrich; chưa cần để có dữ liệu chạy tiếp.
- Nghiên cứu về LLM đóng vai persona cho thấy xu hướng đồng nhất hóa, rập khuôn, mất phương sai; một preprint còn thấy persona kém hơn hỏi thẳng không persona với bài toán tiêu đề. Chưa có kiểm chứng với agent mạng xã hội. Vì vậy đầu ra chưa được coi là dự báo, và dự báo chỉ làm khi có dữ liệu thật từ nhiều nguồn để đối chiếu.
- Kho thô dùng chung giữa các workspace, nên mọi số liệu cho khách hàng phải lọc theo `origin`.

**Rủi ro cần đo ở bước 2**
- `fetchRecords` chạy trong một bước workflow; số thread mỗi run phải đủ nhỏ để không vượt giới hạn thời gian của hàm, nếu cần thì chia thành nhiều run.

## D9 — Lấy reply và định danh tác giả comment (2026-10-14)

Rà lại việc lấy dữ liệu Facebook trước giai đoạn 3.

**Lấy reply**
- `get_all_replies = true`, `maxRowsPerPost` = 150 (`lib/connectors/config.ts`). Reply gồm phản hồi cho comment gốc và phản hồi cho reply khác (Facebook lồng nhiều tầng); `parent_id` trỏ đúng tới cha, `root_id` là bài.
- Run comment ghi `posts[].collected` (mọi dòng) và `posts[].replies` (số dòng reply) để so với `num_comments`.
- **Lý do:**
  - Reply chiếm khoảng 1/3 thảo luận (dữ liệu cũ: 3.089/9.707; probe: ~1/3). Câu trả lời cho câu hỏi người mua và tranh luận đồng ý/phản đối chủ yếu nằm ở reply.
  - Dữ liệu cũ (`legacy_import`) có reply; bỏ reply làm gãy chuỗi số liệu tại mốc chuyển.
  - `num_comments` đếm cả reply, nên luật "tăng ≥ 15%" vốn đã kích hoạt khi reply tăng; trước đây lần lấy lại chỉ trả về comment gốc cũ.
  - `limit_records` đếm cả reply và reply nằm xen giữa comment gốc (28% số dòng ở các bài chạm giới hạn trong dữ liệu cũ), nên nâng từ 100 lên 150.
- Chi phí comment ước tính tăng khoảng 50%.

**Định danh tác giả comment**
- `user_id` của Bright Data là id số (ổn định) hoặc token `pfbid…` đổi giữa các lần cào cùng một comment (31/43 comment `pfbid` thấy ở nhiều lần cào bị đổi id).
- `pfbid` là dạng id ẩn danh của người dùng Facebook: Facebook che id số thật của profile bằng token này, nên không đổi ngược về id số được và không dùng làm khóa định danh lâu dài.
- Thứ tự chọn `authors.external_id` (`to-facebook-comment-author.ts`): id số trong `user_id` hoặc trong link profile (`commentator_profile`) → link profile dạng username → token `pfbid` (gắn `metadata.idStable = false`). Trên dữ liệu probe, số comment đổi id tác giả giữa các lần cào giảm từ 32 xuống 17 (trên 135).
- Item đã có trong kho giữ nguyên `author_id` khi được lấy lại, và không tạo author mới cho item đó.
- **Giới hạn:** khoảng 23% dòng comment chỉ có `pfbid`. Cùng một người comment ở nhiều bài có thể thành nhiều dòng `authors`, nên số tác giả duy nhất từ comment bị đếm dư. Chỉ số theo tác giả nên tách hoặc ghi chú phần `idStable = false`.
