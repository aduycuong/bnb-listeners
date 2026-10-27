# Decisions

Các quyết định đã chốt cho bản xây dựng lại. Ghi thêm khi có quyết định mới; nếu đổi ý thì sửa mục cũ và ghi ngày đổi.

## D1 — Đóng băng pipeline cũ (2026-10-11)

- Không xóa code cũ cho đến giai đoạn 8. Tắt mọi data source và system schedule trong DB, đồng thời xóa schedule tương ứng trên QStash.
- Các job cào comment đã xếp lịch sẽ tự bỏ qua khi data source bị tắt (`scrape-facebook-document-comments`).
- Công cụ:
  - `npm run legacy:freeze -- -- --dry-run | --yes`
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

Dựa trên các thử nghiệm Bright Data ngày 2026-10-12 và 2026-10-13 (`npm run probe:bright-data`, kết quả ở `.local/experiments/`, tóm tắt trong [plan.md](plan.md)). Các con số điều chỉnh được nằm ở `lib/connectors/config.ts` (mặc định; admin chỉnh tần suất và mốc lấy lại ở `/admin/settings`, xem D25).

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
- `sources.monthly_record_limit` (null = không giới hạn). Usage tháng = tổng `collect_runs.item_count` của mọi run thuộc source trong tháng (UTC). Hết ngân sách thì không lên lịch run post và run refresh. ~~Run comment chưa bị chặn theo ngân sách còn lại.~~ Từ D25 run comment cũng bị chặn, và có thêm giới hạn theo ngày.

**Công cụ**
- `npm run refresh:check`: gửi các mốc lấy lại đến hạn bằng tay.
- `npm run collect:renormalize -- -- --run-id <uuid>`: ghi lại payload đã lưu trên R2 vào kho thô (sau khi sửa parser) mà không tạo job Bright Data mới.

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
- Bảng `scenarios`, cột `scenario_id`, `project_scenarios`. (`synthetic_labels` bỏ hẳn, xem D12.)
- Quy tắc cô lập dữ liệu giả theo project (`mode = sandbox`). Cột `origin` đủ để lọc khi cần.
- Chế độ replay (giai đoạn 6), snapshot engagement giả.
- Dự báo phản ứng cộng đồng, calibrate, backtest.

**Lý do**
- Kịch bản có nhãn đúng chỉ cần khi đo Match/Enrich; chưa cần để có dữ liệu chạy tiếp. (Đổi ở D12: dữ liệu giả không dùng để đo.)
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

## D10 — Giai đoạn 3: case BĐS và cấu hình project (2026-10-14)

Đánh giá lại các case trước khi làm cấu hình project. Chi tiết ở [plan.md](plan.md#giai-đoạn-3--cấu-hình-project-và-match-l2--mentions).

**Case**
- Case là một **tình huống theo dõi cụ thể**, không chung chung. Hai case có thể giống nhau ở Collect và Enrich nhưng khác nhau về report và view, nên vẫn là hai case riêng (ví dụ `crisis` tách khỏi `brand`, `rival` tách khỏi `project`).
- `projects.case` lưu id case BĐS thay cho bộ case social listening chung (`general`, `campaign`, `cx`…). Danh sách nằm trong `lib/projects/project-cases.ts`:
  `brand`, `project`, `ir`, `launch`, `broker`, `lead`, `rival`, `market`, `policy`, `kol`, `crisis`, `residents`.
- Case cũ đã được chuyển sang id case BĐS (`general → brand`, `campaign → project`, `competitor → market`, `cx → broker`…). Script chuyển và bảng ánh xạ case cũ đã gỡ ngày 2026-10-26 (D26); `projects.case` không thuộc danh sách thì `parseProjectCase` báo lỗi.
- Giai đoạn 3 làm thật 3 case: `project`, `market`, `brand`. Các case khác hiện ở wizard với nhãn "sắp có".
- `lead` chưa làm vì cần nghiên cứu pháp lý về dữ liệu cá nhân.

**Ưu tiên** (theo dữ liệu đang có: Facebook group/page được theo dõi chủ động, chưa có báo chí, TikTok, rao vặt)

| Ưu tiên | Case | Lý do |
|---|---|---|
| P1 | `project`, `market` | Là nội dung chính của group review BĐS; có giá trị trực tiếp cho marketing |
| P2 | `brand` | Dùng lại pipeline của `project` (CĐT là entity chính, các dự án là `product`); thiếu báo chí nên chỉ số uy tín chưa đầy đủ |
| P2 | `lead` | Giá trị cao cho sales, nhưng là bài toán ý định mua (Enrich) và vướng dữ liệu cá nhân |
| P3 | `launch`, `rival`, `crisis` | Có dữ liệu; `crisis` cần cảnh báo (giai đoạn 6) |
| P4 | `residents`, `broker`, `policy`, `kol` | Cần group riêng tư, rao vặt, báo chí hoặc TikTok/YouTube |
| P5 | `ir` | Cần diễn đàn chứng khoán, báo chí; ít liên quan tới marketing |

**Cấu hình project**
- Entity theo case:
  - `project`: 1 `primary` (dự án, alias là tên phân khu, tên cũ) và các `competitor` (dự án cạnh tranh).
  - `brand`: 1 `primary` (CĐT, alias gồm mã cổ phiếu), các `product` (dự án của CĐT) và các `competitor` (CĐT khác, dùng cho SoV).
  - `market`: các `area` (khu vực), không có `primary`.
- Mỗi entity có một truy vấn được sinh sẵn (`include` = tên + alias), sửa thêm được `with` và `exclude`.
- Trường riêng theo case (phân khúc, giai đoạn, giá tham chiếu, kỳ báo cáo…) nằm trong `projects.case_config` (jsonb, validate bằng zod theo case).
- Aspect khởi tạo từ template theo case, sửa được.
- Nguồn: chỉ chọn trong `sources` đã có, **không thêm group mới từ wizard** (thêm nguồn vẫn qua `npm run collect:facebook`). Project `live` chỉ chọn được nguồn `origin = connector`; project `sandbox` chọn được cả nguồn giả.
- `config_version` của project tăng mỗi khi sửa cấu hình. `project_queries.version` tăng khi sửa `include`, `with`, `exclude` của truy vấn đó.
- Wizard có đủ input cho cả phần chưa chạy (đổi ngày 2026-10-14): cấu hình được lưu ngay, phần xử lý làm ở giai đoạn của nó mà không phải sửa lại form.
  - Cảnh báo: người dùng thêm, sửa, xóa rule chọn từ **danh mục loại rule có cấu trúc** (`lib/projects/alert-templates.ts`), không có bộ dựng tự do. Mỗi loại ứng với một chỉ số sẽ có ở L4 hoặc một trường trích xuất ở Enrich, nên giai đoạn 6 chỉ viết một bộ đánh giá cho mỗi loại.
    - Loại chung: lượng thảo luận tăng, tỷ lệ tiêu cực vượt, một bài lan rộng, từ khóa xuất hiện. Loại riêng `project`: giá lệch giá tham chiếu, câu hỏi người mua tăng.
    - Tham số: phạm vi (toàn project, một entity, một aspect, từng entity của một vai trò), ngưỡng, khoảng thời gian, lượng mention tối thiểu (chống nhiễu khi group ít bài), từ khóa. Cùng một loại được thêm nhiều lần; tối đa 20 rule mỗi project.
    - Mỗi case khởi tạo sẵn vài rule (`ALERT_RULE_SEEDS`). Rule trỏ tới entity/aspect bằng id; id của entity, aspect, rule mới do client sinh để rule tham chiếu được trước khi lưu. Xóa entity/aspect mà còn rule trỏ tới thì form báo lỗi.
    - Bỏ rule "tin chưa kiểm chứng về quy hoạch": cần bộ phân loại tin đồn, không có trong plan; thay bằng lượng thảo luận tăng theo aspect hạ tầng & quy hoạch.
  - Kênh gửi, người nhận và lịch báo cáo AI dùng chung cho cả project (`projects.notification_config`); cột `alert_rules.channels` để dành cho kênh riêng từng rule. Rule bắt đầu chạy từ giai đoạn 6; Email trước, Zalo/SMS/Slack sau.
  - Sửa cảnh báo không tăng `config_version`, vì không ảnh hưởng Match/Enrich.
  - Bỏ "thành viên dự án" khỏi wizard: quyền vẫn theo workspace, sẽ mở rộng ở phần workspace member.
- `projects.is_demo` đánh dấu các project demo (dashboard số liệu mẫu). Project thật chưa hiện dashboard demo, tránh nhầm số liệu mẫu với số liệu thật.

**Phiên bản case**
- Case không đổi được sau khi tạo, nhưng định nghĩa case thay đổi theo thời gian (vai trò entity, aspect mẫu, trường riêng, rule mẫu, report). Mỗi case có danh sách phiên bản trong `CASE_VERSIONS` (`lib/projects/case-templates.ts`); project lưu `projects.case_version`.
- Project chạy được ở phiên bản cũ. Người dùng tự quyết định nâng cấp: trang settings hiện banner khi có phiên bản mới, kèm ghi chú thay đổi; bấm xem thì form chuyển sang phiên bản mới, được điền sẵn bằng `upgrade.migrate` của từng phiên bản; người dùng bổ sung trường mới rồi lưu thì `case_version` tăng. Không lưu thì giữ phiên bản cũ. Không hạ phiên bản.
- Project mới luôn dùng phiên bản mới nhất.
- Không tạo case id mới cho mỗi phiên bản (kiểu "Theo dõi dự án v2"): phân mảnh danh sách case và project cũ vẫn kẹt ở bản cũ.
- Thay đổi chỉ thêm (report mới đọc dữ liệu có sẵn, trường không bắt buộc, loại rule mới) không cần phiên bản mới. Phiên bản mới dành cho thay đổi phá vỡ: trường bắt buộc mới, đổi tên trường, đổi nghĩa vai trò, đổi key aspect.
- Chi phí: code phải giữ mọi phiên bản còn project đang chạy. Report, prompt Enrich và bộ đánh giá cảnh báo (giai đoạn 4–6) đọc `case_version` để chọn đúng định nghĩa. Phiên bản cũ chỉ được xóa khi không còn project nào dùng.
- Nâng cấp phiên bản tăng `config_version` (cấu hình phân tích đổi).

**Không làm**
- "Bộ dữ liệu" của workspace gom mention cho nhiều project (ý tưởng trong wizard demo cũ): thu thập theo nguồn nên không tiết kiệm chi phí cào; gom bộ không liên quan làm sai số liệu và SoV. Mention luôn tính theo truy vấn của từng project trên kho thô.
- Thư viện đối tượng của workspace và danh sách loại trừ chung cho project: chưa làm.

**Hoãn lại**
- Bộ địa danh dùng chung (alias, tên trước/sau sáp nhập tỉnh) cho `market`: tạm thời người dùng tự nhập alias khu vực.
- Truy vấn không từ khóa (mọi nội dung của nguồn đã chọn đều là mention): cần cho `lead` và một phần `market`.

## D11 — Giai đoạn 3: Match (2026-10-14)

Chi tiết ở [plan.md](plan.md#giai-đoạn-3--cấu-hình-project-và-match-l2--mentions).

**Bối cảnh**: trong group BĐS, tên dự án gần như chỉ có ở bài gốc; comment viết "ở đây", "chủ đầu tư", "vụ này". So khớp từ khóa trên từng item sẽ mất phần lớn comment.

**Quyết định**
- Chuẩn hóa: chữ thường, NFC, bỏ dấu (đ → d), gộp khoảng trắng và dấu câu, khớp theo ranh giới từ. Từ khóa tự sinh biến thể không dấu và viết liền. Alias ngắn (≤ 3 ký tự) hoặc viết hoa toàn bộ chỉ khớp nguyên từ trên văn bản gốc, phân biệt hoa thường, không bỏ dấu.
- Tầng 1 (từ vựng): `include` một trong các từ; `with_terms` (nếu có) thêm một từ, trong `proximity` từ nếu đặt; không chứa `exclude`. Chỉ quét nội dung của `project_sources`.
- Tầng 2 (LLM, theo thread): một lần gọi cho bài gốc kèm các item cần xác nhận của thread. Các ca:
  - comment/reply không tự khớp nhưng bài gốc là mention (`match_type = context`);
  - item chỉ khớp ở dạng không dấu trong khi từ khóa có dấu;
  - item chỉ khớp qua alias được đánh dấu dễ nhầm (`project_queries.ambiguous`).
  Kết quả cache trong `match_judgments` theo nội dung item, bài gốc và bộ từ khóa của entity, nên hai project cùng định nghĩa không gọi LLM hai lần.
- `mentions` lưu cả ứng viên bị loại (`is_relevant = false`) để không hỏi lại LLM và để đo. Số liệu chỉ tính mention `is_relevant = true`.
- So khớp lại: `projects.match_signature` là hash của id + version các truy vấn và danh sách nguồn. Chữ ký đổi thì so khớp lại toàn project (workflow `match-project`). Sau mỗi lần thu thập, chỉ so khớp item mới của run cho các project theo dõi nguồn đó.
- Wizard: bước Nguồn đứng trước bước Đối tượng; bước Đối tượng xem trước số item khớp tầng 1 trong 30 ngày trên các nguồn đã chọn.
- Đo: trên mẫu thật gán nhãn tay (giai đoạn 4). Bản đầu có đo trên dữ liệu giả (`--target`, `aboutTarget`, `match:eval`), đã gỡ theo D12.

**Giới hạn đã biết**: comment so sánh đối tượng với dự án khác ("tầm giá này mua được 2 căn Topaz City") đôi khi bị tầng 2 loại. Một lần thử thêm quy tắc vào prompt không sửa được ca này nên giữ prompt v1; cần đánh giá lại trên mẫu thật.

**Hoãn lại**: partition `mentions` theo tháng (giai đoạn 5), bộ mẫu thật gán nhãn tay (cần màn hình gán nhãn).

## D12 — Dữ liệu giả không dùng để kiểm chứng (2026-10-14)

Thay nguyên tắc "dữ liệu giả kèm nhãn đúng để đo chất lượng" (overview, D8, plan giai đoạn 3–4).

**Quyết định**
- Từ lúc vào `content_items`, dữ liệu giả được xử lý như dữ liệu thường: cùng Match, Enrich, không nhánh riêng. `origin` chỉ để lọc khỏi số liệu cho khách hàng; project `live` vẫn chỉ chọn nguồn thật.
- Không dùng nhãn trong `metadata` của dữ liệu giả để kiểm chứng. Metadata chỉ là dấu vết lúc sinh. Bỏ `synthetic_labels` khỏi plan; gỡ `match:eval`, tham số `--target` và nhãn `aboutTarget` của bộ sinh dữ liệu giả.
- Chất lượng Match và Enrich được kiểm chứng trên **mẫu thật gán nhãn tay**. Vì vậy trang Mentions có xem, sửa và gán nhãn làm trước Enrich (giai đoạn 4a).
- Dữ liệu giả vẫn dùng để có thêm nội dung chạy pipeline, demo và kiểm thử tính năng (cảnh báo, replay).

**Lý do**
- Văn bản do LLM sinh rồi được LLM chấm dễ cho điểm cao hơn thực tế (bản đo đầu của Match cho F1 0,996 trên dữ liệu giả); nhãn sinh ra là ý định, không phải đáp án đã kiểm.
- Một chuẩn đo duy nhất (mẫu thật) tránh tối ưu theo dữ liệu giả.

## D13 — Nhãn tay và đo trên mẫu thật (2026-10-14)

Áp dụng D12: chất lượng được đo trên mẫu thật gán nhãn tay. Chi tiết ở [plan.md](plan.md#giai-đoạn-4--enrich).

**Quyết định**
- Nhãn lưu riêng trong `item_labels` (một nhãn cho một item trong một project), không ghi đè kết quả của hệ thống. `mentions.auto_is_relevant` giữ quyết định của Match; `mentions.is_relevant` là giá trị cuối cùng để tính số liệu (có nhãn thì theo nhãn, `user_corrected = true`).
- Item Match bỏ sót mà được gán "có liên quan" thành mention `match_type = manual`, `match_tier = user`. Bỏ nhãn thì item trở về quyết định của Match (mention `manual` bị xóa).
- Mention đã gán nhãn mà Match không còn chọn sau khi đổi cấu hình được giữ lại dưới dạng `manual`, `auto_is_relevant = null`.
- Đợt mẫu (`label_samples`, `label_sample_items`) là mẫu ngẫu nhiên phân tầng theo quyết định của Match lúc lấy mẫu: `relevant`, `rejected` (tầng 2 loại), `unmatched` (không là ứng viên, trong nguồn của project). Mặc định 100 từ mention và ứng viên bị loại (tối thiểu 10 ứng viên bị loại nếu có), 50 từ nội dung không khớp. Kích thước từng tầng được lưu để tính recall có trọng số.
- Khi gán nhãn mẫu, giao diện không hiện quyết định của hệ thống.
- Precision và recall chỉ tính trên nhãn của đợt mẫu; nhãn sửa lẻ trong danh sách không tính (lệch về phía ca sai người dùng tự thấy). Precision = tỉ lệ đúng trong tầng `relevant`; recall = ước lượng đúng tìm được / (đúng tìm được + đúng bị bỏ sót), mỗi tầng nhân theo kích thước. Đổi cấu hình Match sau khi lấy mẫu thì mẫu bị đánh dấu không còn khớp, nên lấy mẫu mới.
- Quyền: `edit` mới gán và sửa nhãn, `read` chỉ xem.

## D14 — Giai đoạn 4b: Enrich (2026-10-14)

**Quyết định**
- Làm giàu theo thread: mỗi lần gọi `gpt-4.1-mini` gồm bài gốc (ngữ cảnh) và tối đa 20 mention có liên quan của thread. Mention không liên quan được đánh dấu `skipped`, không làm giàu.
- Kết quả mỗi mention (structured output, schema dựng theo cấu hình project): `sentiment` + `sentiment_score` (thái độ với đối tượng theo dõi, không phải tâm trạng chung), `emotion` (6 cảm xúc của demo hoặc null), aspect của project kèm sentiment (`mention_aspects`), sentiment theo từng entity (`mention_entities`), trích xuất riêng theo case (`mention_extractions`).
- Trích xuất định nghĩa trong `CASE_VERSIONS` (`extractions`): `project` có `price_quote`, `buyer_question`; `market` có `price_quote` kèm khu vực; `brand` chưa có. Thêm trường này là thay đổi chỉ thêm nên giữ phiên bản case.
- Chữ ký Enrich thay cho `config_version`: hash của aspect (và mô tả), entity, case + phiên bản case, các trường trích xuất, phiên bản prompt và model. Mention được làm giàu lại khi chữ ký đổi, nội dung item đổi (`enriched_content_hash`) hoặc lần trước lỗi.
- Chạy: workflow `enrich-project` được gọi ở cuối `match-project` (cả toàn bộ lẫn tăng dần) và khi lưu cấu hình mà không phải so khớp lại. `npm run enrich:project` để chạy tay.
- Nhãn không ghi đè kết quả AI (theo D13): `mentions.auto_sentiment` giữ kết quả AI, `mentions.sentiment` theo nhãn nếu có. Aspect gán tay nằm ở `item_labels.aspect_keys` (null = chưa gán, [] = không có aspect) và được ưu tiên hơn `mention_aspects` (chỉ chứa kết quả AI).
- Đo: mẫu loại `enrich` lấy ngẫu nhiên từ mention có liên quan đã làm giàu; khi gán nhãn không hiện kết quả AI. `npm run eval:enrich` và trang Mentions: accuracy sentiment kèm ma trận nhầm lẫn, precision/recall/F1 aspect (micro và từng aspect). Chưa đo emotion và trích xuất.
- Ngưỡng chấp nhận trên mẫu thật: sentiment accuracy ≥ 80%, aspect F1 ≥ 0,7.
- `buyer_question.topic` chọn trong aspect của project (hoặc `other`) thay vì chữ tự do, để câu hỏi người mua nhóm theo cùng bộ khía cạnh (`aspectField` trong định nghĩa trích xuất).
- Prompt v2 (sau khi chạy thử trên dữ liệu thật): dấu phẩy là dấu thập phân ("2,4 tỷ" = 2.4); tin rao bán, cho thuê, quảng cáo là trung tính trừ khi có thái độ. Câu mỉa mai đôi khi vẫn bị chấm ngược, cần đo trên mẫu.

## D15 — Giai đoạn 4c: Topic (2026-10-15)

Topic là chủ đề cụ thể nổi lên từ dữ liệu ("chậm bàn giao tòa S2", "phí quản lý tăng"), khác aspect là bộ khía cạnh cố định do project cấu hình. Topic phải ổn định theo thời gian để tính được tăng trưởng.

**Quyết định**
- Enrich (prompt v4) trả thêm `topic_hint` cho mỗi mention: cụm từ ngắn nêu sự việc hoặc vấn đề cụ thể mà mention bàn tới, dùng bài gốc làm ngữ cảnh; ghi vấn đề, không ghi tên dự án, khu hay thương hiệu trừ khi vấn đề chỉ đúng với một nơi; null với cảm thán, tag người, nội dung không có ý. Không gọi LLM riêng cho từng mention.
- Gán và tìm topic bằng LLM trên `topic_hint`, không gom cụm bằng embedding. Lần chạy thử trên Vinhomes (2026-10-15): embedding của hint bị tên khu chi phối (hint khác chuyện nhưng cùng tên khu giống nhau 0,70–0,75, hint cùng chuyện khác chữ chỉ 0,59–0,69), không ngưỡng nào tách được; chuẩn hóa hint trước khi embed thì topic thành chung chung như aspect. LLM gom trực tiếp bắt được các chủ đề embedding bỏ sót (ví dụ "Phong cách Châu Âu ở Cần Giờ").
- Topic gắn với từng mention (một mention thuộc tối đa một topic) và thuộc về project. Topic không bị tính lại từ đầu mỗi lần chạy; mention đã gán thì giữ topic, trừ khi `topic_hint` đổi hoặc topic bị gộp.
- Mỗi lần chạy (workflow `topic-project` với `kind` `topic` hoặc `buyer_question`, gọi ở cuối `enrich-project`; `npm run topics:project -- -- --kind <kind>` để chạy tay):
  1. Embed các `topic_hint` mới hoặc đã đổi (`text-embedding-3-small`, bảng `mention_embeddings` kèm hash văn bản). Hint đổi thì mention rời topic cũ và chờ gán lại. Embedding dùng để tìm cặp topic nên gộp và sau này cho hỏi đáp AI.
  2. Gán (`gpt-4.1`): khi có mention mới chờ gán, một lần gọi LLM nhận danh sách topic đang có (`active`, `hidden`) và các hint chờ (mention mới cùng mention chưa có topic trong 30 ngày gần nhất). LLM gom hint vào topic cũ, vào topic mới (cần ≥ 3 mention, kèm `name` và `description`), hoặc để chờ (`topic_status = unassigned`). Nếu có topic mới, hint còn lại được hỏi lần hai, từng hint một, chọn một topic hoặc không: hỏi theo nhóm thì model dồn hint chung về giá vào topic hẹp "Giá bán ảo". Nhiều hint thì chia nhiều lần gọi. `gpt-4.1-mini` gán nhiều hơn nhưng tạo topic rộng như aspect, nên dùng `gpt-4.1` (1–2 lần gọi mỗi lần chạy). Topic "mới" trùng tên (không phân biệt hoa thường, khoảng trắng) với topic `active`/`hidden` đã có, hoặc với topic vừa tạo trong cùng câu trả lời, thì nhận mention vào topic đó thay vì tạo thêm.
  3. Tính lại tâm (trung bình embedding) và số mention có liên quan của mỗi topic.
  4. Gộp: topic `active` cùng tên được gộp thẳng vào topic lớn nhất, không hỏi LLM; sau đó cặp topic có tâm gần nhau được hỏi LLM có phải cùng một chủ đề không; topic nhỏ hơn được gộp vào topic lớn hơn (`status = merged`, `merged_into_id`).
- `topics.aspect_id` (có thể null): aspect chiếm ≥ 40% mention của topic lúc tạo, lấy từ kết quả Enrich, không hỏi thêm LLM.
- Tên topic (prompt gán v2, 2026-10-15): một vấn đề, không có tên dự án hay project, không có "và" nối hai vấn đề. Prompt gán không đưa tên project vào (ở v1, `gpt-4.1` gắn "Lavita Thuận An" vào cả 7 tên topic lần chạy đầu của sandbox). Hint chỉ nêu khía cạnh ("pháp lý dự án") hoặc ghép nhiều vấn đề không đủ để tạo topic mới. Chạy thử lần gán đầu, chỉ đọc: Vinhomes từ 5 lên 10 topic cụ thể, 45 lên 61 mention được gán, không tên nào có tên dự án; sandbox Lavita bỏ được tên project và "và", nhưng vẫn còn topic rộng ("Giá bán dự án", "Vấn đề pháp lý dự án") vì hint giả sinh theo aspect. Gặp cặp "gần trùng" như "Tiến độ xây dựng và chất lượng thi công" và "Tiến độ xây dựng dự án" thì sửa tên, không hạ ngưỡng gộp: hint của topic thứ nhất toàn về chất lượng xây dựng, tức hai vấn đề khác nhau.
- Topic có `status`: `active`, `hidden` (người dùng ẩn; vẫn nhận mention để không nổi lên lại thành topic mới), `merged`.
- Người dùng (quyền `edit`) đổi tên, sửa mô tả, ẩn/hiện và gộp topic. Trang Mentions có lọc theo topic. Biểu đồ Topics làm ở giai đoạn 5.
- Mỗi `(project, kind)` chỉ chạy một bước của workflow `topic-project` tại một thời điểm (flow control `topics-<kind>-<projectId>`, parallelism 1). `kind = buyer_question` gom `mention_extractions.buyer_question.question` vào `topics.kind = buyer_question` (enricher `question_assign`). Lần seed lịch sử Lavita (2026-10-15) cho thấy nhiều lần Enrich xong cùng lúc làm các lần chạy topic song song cùng thấy một danh sách topic và một nhóm hint chờ, nên tạo cùng một topic nhiều lần và ghi đè mention của nhau, để lại topic rỗng.
- Các tham số (kích thước topic mới tối thiểu, số ngày hint được chờ, ngưỡng gộp) nằm trong `lib/topics/config.ts`.
- `mention_topics.confidence` = 1 khi LLM gán, độ tương đồng khi gán bằng cách khác về sau.
- Đo: mẫu loại `topic` (mention có topic, gán nhãn "đúng topic hay không") làm sau phần lõi.

## D16 — Từ khóa (2026-10-15)

Từ khóa là các cụm từ ngắn mà mention nói tới ("sổ hồng", "phí quản lý", "Châu Âu"), hiện trên đám mây từ khóa của trang Topics. Khác topic: topic là một vấn đề nhiều người cùng bàn, từ khóa chỉ là sự vật được nhắc tới, không cần gom.

**Quyết định**
- Enrich (prompt v5, `gpt-4.1-mini`) trả thêm `keywords`: 0–3 cụm danh từ 1–3 chữ, tiếng Việt có dấu, đúng chính tả, viết đầy đủ chữ viết tắt; không lấy tên đối tượng theo dõi, từ chức năng, thái độ, con số đơn lẻ. Không tách cụm từ bằng code: cần bộ tách từ tiếng Việt, và cách đếm từ của demo ra các từ vô nghĩa ("hạ", "giảm", "tuần"). Enrich vốn gọi LLM cho mỗi mention nên gần như không tốn thêm.
- Chuẩn hóa: NFC, chữ thường, một khoảng trắng, bỏ dấu câu và `#` ở hai đầu; giữ dấu tiếng Việt vì bỏ dấu sẽ gộp nhầm ("phí", "phi"). Biến thể không dấu và viết tắt được model viết lại khi trích. Từ khóa chứa tên hoặc tên khác của đối tượng theo dõi (theo từng chữ) bị bỏ ở code, kể cả khi model trả về.
- Lưu ở `mention_keywords` (`mention_id`, `keyword` chuẩn hóa, `text` cách model viết); mỗi lần Enrich thay toàn bộ từ khóa của mention.
- Trang Topics đếm thẳng từ bảng khi đọc, theo cùng kỳ báo cáo: số mention liên quan và tỉ lệ tiêu cực mỗi từ khóa, lấy `TOPIC_CONFIG.reportKeywords` (30) từ khóa nhiều nhất; tên hiển thị là cách viết gặp nhiều nhất. Chuyển sang L4 cùng lúc với topic.
- Tăng prompt Enrich lên v5 thì mọi mention được Enrich lại. `topic_hint` có thể đổi theo, khi đó mention rời topic cũ và chờ gán lại (D15).
- Chạy thử chỉ đọc trên sandbox Lavita và Vinhomes (2026-10-15): không còn tên đối tượng; từ khóa phổ biến vẫn là khía cạnh chung ("giá", "vị trí", "pháp lý", "tiện ích"), bên cạnh từ cụ thể ("phí quản lý", "sổ hồng", "ngập", "Châu Âu"). Chưa lọc từ khóa chung; xem lại sau khi có dữ liệu thật.
- Lọc từ khóa chung (prompt v7, 2026-10-15; v6 chỉ chạy thử trên nhánh). Chẩn đoán: trên Sandbox gần nửa số lượt từ khóa top 50 trùng tên khía cạnh (dữ liệu giả sinh theo khía cạnh nên câu chứa sẵn các chữ đó); trên Vinhomes đứng đầu là "giá bán", "giá", "vị trí", "căn hộ", "nhà", "mua"; bình luận ngắn bị gán nhóm chủ đề dù không nhắc tới ("Rẻ thiệt" → "giá", "Ở đâu vậy b" → "vị trí"). Hai lớp:
  - Prompt: chỉ lấy sự vật, địa điểm, chi phí, thủ tục cụ thể mà văn bản thực sự nhắc tới, không suy ra nhóm chủ đề; không lấy tên khía cạnh, từ chung về bất động sản, con số, số tiền, diện tích (v6 đẩy lên "27 tỷ", "50m2" trên Vinhomes).
  - Code (`pickKeywords`): bỏ từ khóa trùng `ENRICH_CONFIG.genericKeywords` hoặc trùng tên khía cạnh của project, cả tên đầy đủ lẫn từng phần tách theo "&", ",", "/", "và" ("Giá & thanh toán" → "giá", "thanh toán"), và từ khóa bắt đầu bằng chữ số ("3 tỷ", "50m2"; mất luôn "2 phòng ngủ", chấp nhận). So khớp nguyên cụm, nên "giá thứ cấp", "phí dịch vụ" vẫn giữ; khía cạnh tên ngắn như "Phí quản lý" thì từ khóa cùng tên bị bỏ, vì khía cạnh đã có biểu đồ riêng.
  - Biến thể "giá" / "giá bán" / "giá nhà" / "giá căn hộ" không gộp mà cùng nằm trong danh sách chung. Chưa có bảng đồng nghĩa; thêm khi dữ liệu thật cho thấy cần.

## D17 — Giai đoạn 5b: số liệu dashboard (2026-10-15)

**Quyết định**
- Chưa làm `metrics_hourly` / `metrics_daily`. Overview và Sentiment đọc thẳng từ L3 (`mentions`) như Topics 5a: project lớn nhất có khoảng 700 mention, hai service chạy dưới 1 giây. Truy vấn nằm trong `lib/metrics/` sau API `/api/metrics/overview` và `/api/metrics/sentiment`, nên chuyển sang L4 không đổi giao diện. Cảnh báo (D23) cũng đọc thẳng L3, nên chưa cần `metrics_hourly`.
- Bỏ Reach trên project thật, thay bằng **Tương tác** (like + comment + share của chính item; với comment, comment là số trả lời) và **Tác giả** (số tác giả khác nhau). Nguồn Facebook gần như không có lượt xem, chỉ có số thành viên group, nên chưa có cơ sở ước tính reach.
- Công thức dùng chung ở `lib/metrics/formulas.ts` (NSS, tỉ lệ, tăng trưởng, SoV) và `lib/metrics/utils/engagement-sql.ts`. NSS và tỉ lệ tiêu cực tính trên mention đã có sentiment. Từ 2026-10-26 chỉ mention đã Enrich gán cho đối tượng của project mới được tính (D26).
- SoV = mention nhắc đối tượng `primary` / mention nhắc `primary` hoặc `competitor` (`mention_entities`). Project không có đối thủ thì ô SoV hiện "—".
- Kỳ báo cáo là N ngày trọn theo `projects.timezone`, tính cả hôm nay (`METRICS_CONFIG.reportPeriodDays`: 7, 14, 30, mặc định 14; kỳ đã chọn được nhớ trên trình duyệt và dùng chung cho mọi report, kể cả Topics), so với N ngày liền trước. Khác Topics 5a (khoảng trượt tính từ lúc xem) vì biểu đồ theo ngày cần ngày trọn.
- Cảm xúc theo khía cạnh theo D14: khía cạnh của nhãn tay (kèm sentiment của mention) khi item đã gán nhãn, nếu không thì khía cạnh của Enrich kèm sentiment riêng của khía cạnh.
- "Kênh thảo luận" trên Overview tính theo nguồn (group, page) vì hiện chỉ có Facebook. Overview xếp như demo: biểu đồ đề cập (8) cạnh khung AI tóm tắt (4), rồi cảm xúc, kênh và chủ đề mỗi khung 4 cột. Khung AI giữ nội dung mẫu của demo; hỏi đáp chưa gọi mô hình. Case Theo dõi dự án thêm hai widget giá (xu hướng theo ngày và phân bố) trên Overview, trỏ sang trang Chi tiết dự án. Case Uy tín chủ đầu tư thêm ba widget (D26). Widget case của các case khác vẫn để sau.
- Channels (PR 2) giữ bố cục demo dù mới có 1 kênh và 1 nguồn mỗi project. Kênh = nền tảng, Facebook group tách khỏi page/profile (`lib/metrics/utils/channel-label.ts`). Bản đồ nhiệt tính theo `projects.timezone`.
- Authors (PR 2) xếp theo tổng tương tác của các đề cập của tác giả trong kỳ. Nhóm tác giả giữ như demo (`AUTHOR_TIERS`): Mega/Macro/Micro KOL theo số người theo dõi, "Báo chí, thương hiệu" theo `authors.author_type`, còn lại là người dùng thường, kể cả tác giả chưa có số người theo dõi (toàn bộ tác giả thật hiện nay). Phân loại tác giả làm ở task riêng. Không dùng `metadata.isPage` để nhận biết page: cờ này lấy từ `delegate_page_id` của bài và đúng cả với tài khoản cá nhân.

## D18 — Tách Enrich theo từng loại (2026-10-21)

**Quyết định**
- Mỗi enricher (sentiment, aspects, entities, `topic_hint`, `terms`, extraction theo case, stage `terms_index` / `topic_assign`) có chữ ký, phiên bản và trạng thái riêng trong `mention_enrichments`. Chạy lại một loại không ghi đè loại khác. `only` và `force` trên workflow `enrich-project` và `npm run enrich:project`.
- `mentions` chỉ còn kết quả Match và cột copy từ L1. Sentiment AI ở `mention_sentiments`; sentiment hiệu lực = `coalesce(item_labels.sentiment, mention_sentiments.sentiment)`.
- Registry (`lib/enrichment/registry.ts`) liệt kê mọi enricher kèm `status` (`ready` | `planned`). Case template khai báo `enrichers.case` và `enrichers.optional` trên nền `CORE_ENRICHERS`. `project_enrichers` là seed + công tắc theo project; thêm enricher cho report mới không cần `case_version`.
- Lớp thô chuỗi/dữ kiện (`topic_hint`, `terms`, `price_quote`, `buyer_question`, …) lưu `mention_extractions`. Stage `terms_index` (code) ghi `mention_terms`. Stage `topic_assign` ghi `topics` / `mention_topics` với `kind = topic`; stage `question_assign` ghi `kind = buyer_question`. `argument` vẫn để sau.
- Dữ liệu Enrich cũ được xóa, không chuyển. Chạy lại Enrich sau migrate.

**Lý do:** một chữ ký chung làm đổi luật từ khóa (D16 v5–v7) phải Enrich lại sentiment và extraction; demo La Pura cần thêm extraction theo case mà không đụng các loại đã đúng.

## D19 — TikTok qua TikHub (2026-10-22)

Chọn nhà cung cấp và cách thu thập TikTok sau các thử nghiệm ngày 2026-10-21 và 2026-10-22 (`scripts/probe-bright-data-tiktok.ts`, `scripts/probe-tikhub-tiktok.ts`, kết quả ở `.local/experiments/`). Tiêu chí: lấy được **bài mới theo thời gian** như Facebook, cho kênh lẫn từ khóa. Các con số điều chỉnh được nằm ở `COLLECT_CONFIG.tiktok` (`lib/connectors/config.ts`).

**Quyết định**
- Dùng **TikHub** cho kênh, tìm từ khóa, bình luận, reply và làm mới video. Không dùng dataset TikTok của Bright Data (các script probe được giữ để đo lại). Khóa API: `TIKHUB_API_KEY`.
- TikHub trả kết quả ngay trong response, không có job hay webhook, nên bốn connector là `DirectConnector`, đi cùng workflow `collect-source` (payload vẫn lưu lên R2 và parse lại được bằng `collect:renormalize`):

| Connector | Việc | Endpoint TikHub |
|---|---|---|
| `tiktok-posts` | bài mới của một kênh | `web/fetch_user_profile` (một lần) + `web/fetch_user_post` |
| `tiktok-search` | bài mới theo từ khóa | `app/v3/fetch_video_search_result` |
| `tiktok-post-refresh` | làm mới số liệu tại các mốc | `app/v3/fetch_multi_video` |
| `tiktok-comments` | bình luận và reply | `app/v3/fetch_video_comments`, `fetch_video_comment_replies` |

**Nguồn (`sources`)**
- Kênh: `platform = tiktok`, `source_type = channel`, `external_id` = id số của tài khoản (không đổi khi đổi username); `metadata.uniqueId` và `metadata.secUid`. Đăng ký bằng `npm run collect:tiktok -- -- --url https://www.tiktok.com/@name --yes` (một request lấy `secUid` và số người theo dõi).
- Tìm từ khóa: `source_type = search`, `external_id = <REGION>:<từ khóa>` (`VN:vinhomes`; từ khóa cắt khoảng trắng, NFC, chữ thường, **giữ dấu** vì tìm kiếm phân biệt "phí" và "phi"), `url = null`. Project theo dõi một từ khóa bằng cách chọn nguồn này.

**Quét kênh (`tiktok-posts`)** giống `facebook-posts` (D7): `since` = bài mới nhất − 2 giờ (nguồn mới: 24 giờ), bài đã có bị bỏ qua, sau run tạo lịch làm mới và tính lại tier.
- Phân trang mới nhất trước (`cursor` là giờ đăng, tính mili-giây, của bài cuối trang) và dừng sau trang có bài cuối cũ hơn `since`. Xét bài cuối trang, không xét bài bất kỳ: bài ghim cũ ở đầu trang 1 không được làm dừng sớm. Bài cuối trang trước lặp lại ở đầu trang sau nên gộp theo id.
- TikHub không có `start_date`, nên phía ta tự dừng; mỗi trang chỉ khoảng 15 bài dù yêu cầu 20, nên dùng `hasMore`, không dùng "trang đủ số bài" làm tín hiệu còn trang sau.

**Tìm từ khóa (`tiktok-search`)**
- `publish_time = 1` (24 giờ qua) và `region = VN`. TikHub chỉ có cửa sổ từ 1 ngày trở lên và chỉ sắp theo độ liên quan hoặc lượt thích, **không có "mới nhất"**. Với `publish_time = 1`, cả 33 video của một lần thử đều đăng trong 24 giờ.
- Mỗi lần gọi trả một **mẫu** khác nhau (ba lần liên tiếp: 33, 39 và 10 video khác nhau, trùng nhau từ 1 đến 11 video), và trang rỗng giữa chừng không có nghĩa hết (trang 3 vẫn trả 20 video sau trang 2 rỗng). Vì vậy mỗi run lấy **đủ số trang cố định** (mặc định 4), không dừng sớm, gộp theo id; độ phủ nhờ chạy nhiều lần. Lịch cố định **6 giờ**, không theo tier (không có "bài mỗi ngày" để đo). Bài đã có bị bỏ qua.
- `region` chỉ làm TikHub **ưu tiên** kết quả, không lọc cứng: từ khóa ít bài trong 24 giờ (đo với "trellia vista": 1 bài khớp trong 6 video) bị lấp bằng video nước ngoài. Nên `normalize` bỏ video có `region` khác region của run (video không có `region` vẫn giữ), tính vào `skipped`.
- Để nguồn search mới có dữ liệu ban đầu, `npm run search:tiktok -- -- --keyword "…" --yes` chạy một lần với `publish_time = 0` (không cửa sổ; probe "trellia vista" trả 40/40 video VN). Chạy theo lịch vẫn dùng cửa sổ 24 giờ.
- Bài tìm thấy thuộc **nguồn search**, không thuộc kênh của tác giả; Match chỉ quét nguồn của project (D11). Khi sau này nâng tác giả thành nguồn kênh, bài đã có vẫn thuộc nguồn search (bị bỏ qua khi quét kênh), nên v1 **không tự nâng kênh**.
- Đo trên cùng từ khóa và cửa sổ 24 giờ (`vinhomes`): Bright Data Search URL Fast (có `start_date`, chính xác tới giờ) cho 14 bài khác nhau, 100% chứa từ khóa; TikHub gộp mọi lần tìm trong ngày cho 94 bài, 63% chứa từ khóa, và chứa 12/14 bài của Bright Data. Ước lượng bắt-thả lại thô khoảng 110 bài khớp trong 24 giờ, nên ba lần tìm TikHub phủ khoảng 60%. Độ phủ thật chưa biết.

**Bình luận và làm mới**
- Luật mốc +6, +24, +72 giờ và luật lấy bình luận (D7) áp dụng cho TikTok, chọn connector theo `content_items.platform`: Facebook đọc lại bằng URL, TikTok bằng id video (`planRefreshRuns`, `planCommentRuns`).
- Bình luận gốc trước, rồi reply của từng bình luận gốc trong phần giới hạn còn lại: **150 dòng mỗi video, tính cả reply** (D9). Reply gồm cả trả lời một reply khác (`reply_to_reply_id`, cha là reply đó, nếu không thì cha là bình luận gốc). Thứ tự bình luận không chọn được, nên video nóng có thể thiếu bình luận mới (như Facebook). Mỗi run tối đa 5 video vì một video có reply cần hàng chục request.
- `user.uid` của bình luận là id số ổn định, nên không gặp vấn đề `pfbid` của Facebook (D9).
- Bình luận không có chữ (sticker) bị bỏ.

**Ghi vào kho thô**
- Video là `kind = post`; không lưu ảnh và file video (liên kết CDN có chữ ký và hết hạn); `media` chỉ chứa transcript (D21). Tác giả theo id số. Thông tin riêng TikTok (hashtag, nhạc, thời lượng, số lượt lưu, cờ ghim) ở `metadata`.
- Thời lượng: payload kiểu App tính bằng **mili-giây**, kiểu Web bằng giây; mapper đổi về giây.

**Lỗi, thời gian và chi phí**
- Quét kênh và tìm từ khóa **hỏng cả run nếu một request lỗi**, không lưu một phần: quét mới nhất trước, lưu các trang đầu rồi mất các trang sau thì `since` của run kế tiếp (từ bài mới nhất đã lưu) bỏ qua vĩnh viễn phần cũ hơn. Bình luận có thể lưu một phần (không ảnh hưởng `since`), video chưa xong ghi vào `collect_runs.stats`.
- `fetchRecords` chạy trong một bước workflow, nên mỗi lần gọi có hạn chót (`runBudgetMs`, 45 giây); quá hạn thì lỗi `ERR_TIKTOK_RUN_TIMEOUT`. Bước `start` không gọi TikHub lần hai khi workflow retry (payload đã lưu).
- Lỗi `402` (hết số dư) và `401` không retry; `429` và `5xx` retry có backoff (tối đa 3 lần).
- TikHub tính tiền **theo request** (khoảng $0,001 đến $0,01; giá riêng từng endpoint TikTok chưa xác nhận). Số request mỗi run ghi ở `collect_runs.stats.requests`. `sources.monthly_record_limit` vẫn đếm số bản ghi giao về (D7), **chưa có ngân sách theo request**.

**Chưa làm hoặc chưa đo**
- Chạy workflow `collect-source` end to end với DB, QStash và tunnel cho TikTok: mới kiểm chứng `fetchRecords` và `normalize` trên TikHub thật.
- Kích thước lô tối đa của `fetch_multi_video` (đặt 20, mới thử 2) và giới hạn thời gian thực của một bước workflow.
- Ngân sách theo request, tự nâng tác giả thành nguồn kênh, nguồn hashtag, tải media về R2.

**Lý do:** Bright Data không có cách lấy "bài mới theo từ khóa" ngoài dataset Search URL Fast (hoạt động nhưng trả nhiều dòng lặp: 33 dòng chỉ có 5 bài khác nhau ở một lần chạy 6 giờ, và dataset bình luận có `collect_replies` mất khoảng 12 phút cho 5 bình luận). TikHub nhanh hơn (mỗi request 0,4 đến 4,5 giây so với 1 đến 20 phút), cho kênh và bình luận hành vi xác định, và cho ta quyền kiểm soát số bình luận và reply. Điểm yếu cần chấp nhận là tìm từ khóa chỉ là một mẫu theo cửa sổ 24 giờ, không phải danh sách đầy đủ; vì thế kênh vẫn là cách bảo đảm độ phủ và từ khóa là cách phát hiện.

## D20 — Lấp gap bằng backfill theo khoảng thời gian (2026-10-22)

Run thường chỉ nhìn về phía trước từ bài mới nhất (D7), nên phần trước đó không bao giờ được xem lại: source thêm trễ, hoặc dừng (pause, scheduler tắt) lâu hơn giới hạn một run. Lệnh `npm run backfill -- -- --source <id|url> --from <ngày> [--to <ngày>] [--max-records N] [--window-days N] [--yes]` lấp khoảng đó.

- Chỉ Facebook và kênh TikTok. Tìm từ khóa TikTok không có cửa sổ quá khứ nên không backfill được.
- `--to` mặc định là bài cũ nhất trong kho + 2 giờ chồng lấn, nên với source thêm trễ chỉ cần `--from`. Mặc định là dry-run (in khoảng, số run và số bài đã có trong khoảng); cần `--yes` để chạy.
- Mỗi cửa sổ là một `collect_runs` qua workflow `collect-source`, params có `until` và `backfill: true`. Không đụng `since` của lịch thường, không đo late arrival. Bài đã có bị bỏ qua nên chạy lại không trùng. Bài cũ vẫn qua hook `after-post-scan` (luật comment/làm mới áp như bình thường; bài đã qua mốc +72 giờ không có lịch lấy comment).
- Facebook: một run cho cả khoảng (`start_date`, `end_date`; job Bright Data không có hạn thời gian).
- TikTok: chia cửa sổ `backfillDaysPerRun` (2 ngày), mỗi run tối đa `maxPagesPerBackfillRun` (20 trang) vì một bước workflow bị chặn `runBudgetMs`. Quét bắt đầu với `cursor = until` (cursor là giờ đăng tính ms) rồi đi lùi tới `since`, bỏ video mới hơn `until`. Run bị cắt ghi `stoppedBy: maxPages` vào stats; khi đó chạy lại phần còn thiếu với `--window-days` nhỏ hơn.
- **Chưa kiểm chứng:** TikHub `web/fetch_user_post` có nhận `cursor` tùy ý (đặt bằng `until`) hay không, và Bright Data có lọc đúng `end_date` dạng ISO datetime như `start_date`. Cần một lần chạy thật với khoảng ngắn.

## D21 — Transcript video TikTok (2026-10-22)

Nội dung chính của video TikTok nằm trong lời nói, còn `text` chỉ là caption. Caption gần như luôn có tên dự án nên đủ để tạo mention, nhưng enrich bài video trên caption chỉ là enrich lời quảng cáo của người đăng. Vì vậy video được lưu thêm **transcript** lấy từ phụ đề TikTok tự tạo.

**Probe ngày 2026-10-22** (`scripts/probe-tiktok-subtitles.ts`, 178 video của project Trellia Vista / TT Genesis, kết quả ở `.local/experiments/`)
- 84/178 video (47%) có phụ đề theo ngôn ngữ gốc: 83 do TikTok nhận dạng giọng nói (ASR), 1 do người đăng viết; 79 tiếng Việt. Video không có phụ đề có `no_caption_reason` 1 hoặc 3.
- Phụ đề là file WebVTT trên CDN của TikTok, link có chữ ký và **hết hạn sau khoảng 30 ngày**. Tải mỗi file trung bình 250 ms, không tính tiền TikHub. Transcript trung bình 1.850 ký tự, dài nhất 11.600.
- Payload search (`cla_info.caption_infos`) và quét kênh (`video.subtitleInfos`) có phụ đề; `fetch_multi_video` (làm mới) **không có**.
- ASR **viết sai tên riêng nước ngoài** theo cách đọc: "Trellia Vista" thành "chelia vita", "gelia victa", "trailer vista", "Mizuki" thành "miyugi", "missiki". Trên 72 video có tên trong caption, transcript chỉ khớp từ vựng ở 37 (khớp được "TT Genesis", không khớp được "Trellia Vista"). Không có video nào chỉ nhắc tên trong lời nói (tìm từ khóa vốn trả video có tên trong caption).

**Quyết định**
- Transcript là một phần tử của `content_items.media`: `{ type: "transcript", url, text, language, source }`. `url` là bản sao file VTT trên R2 (bucket media, key `transcripts/tiktok/<videoId>.vtt`), null khi lưu R2 lỗi; `text` lưu ngay trong media vì Match quét hàng nghìn dòng. Chỉ bỏ bản dịch máy, ưu tiên tiếng Việt. Không cần migration (jsonb).
- Connector `tiktok-search` và `tiktok-posts` tải phụ đề **trong `fetchRecords`**, chỉ cho video chưa có trong kho, rồi gắn vào record dưới khóa `transcript`, nên payload lưu trên R2 giữ transcript và `renormalize` dùng lại được. Lỗi tải hoặc hết `runBudgetMs` chỉ làm video đó thiếu transcript, **không hỏng run**; số liệu ở `collect_runs.stats.transcripts`. Cấu hình ở `COLLECT_CONFIG.tiktok.transcripts`.
- `content_hash` tính trên text + transcript, nên transcript đến sau sẽ làm Match (cache phán xét) và Enrich chạy lại. Item không có transcript giữ nguyên hash cũ. Lần ghi không mang transcript (làm mới video) giữ transcript đã lưu.
- **Match**: tách từ trên caption trước. Khớp trong caption giữ như cũ. Khớp **chỉ trong transcript** luôn qua tầng 2 (LLM), vì ASR viết sai và video có thể chỉ nhắc lướt qua. Bình luận của video chỉ nhắc tên trong lời nói vẫn thành ứng viên ngữ cảnh. Prompt tầng 2 có lời nói của bài gốc (cắt `maxTranscriptChars`), kèm lưu ý tên riêng có thể bị viết sai.
- **Enrich**: prompt có lời nói của bài gốc (cắt `maxTranscriptChars`) như một phần nội dung bài gốc, nên bài video được enrich theo nội dung video và bình luận có ngữ cảnh.
- Prompt của item không có transcript (Facebook, video không phụ đề) không đổi, nên không tăng `promptVersion` hay version enricher.
- Video lưu trước khi có transcript: `npm run backfill:tiktok-transcripts -- -- [--source-id <id>] --yes` đọc lại payload trên R2 (link phụ đề còn hạn khoảng 30 ngày), chỉ đổi `media` và `content_hash`; sau đó chạy match và enrich của project.

**Chưa làm**
- Khớp tên bị ASR viết sai: xem D22.
- Video không có phụ đề (khoảng một nửa): nghe audio bằng mô hình (Gemini), chỉ cho video đã khớp hoặc nhiều tương tác.
- Hiển thị transcript ở màn hình gán nhãn và danh sách mention (hiện chỉ có ở trang admin của content item).

## D22 — Sửa transcript bằng LLM theo tên đối tượng (2026-10-22)

ASR viết sai tên riêng nước ngoài (D21), nên transcript ít khớp tên dự án. Một lớp LLM sửa các tên bị nghe sai, dựa trên danh sách tên của các project theo dõi nguồn.

**Đo ngày 2026-10-22** (`scripts/probe-transcript-correction.ts`, 74 video của project TT Genesis / Trellia Vista, kết quả ở `.local/experiments/`)
- Cách đầu (model viết lại cả transcript) chèn tên sai: "treleco" (Trellia Cove, phân khu khác) và "the Park Vista" (dự án khác) thành "Trellia Vista", "Australia" thành "TT Genesis"; model còn sửa tên ngoài danh sách và đổi lời gốc. Cả 5 video có tên trong transcript mà không có trong caption đều là chèn sai.
- Cách giữ lại: model **chỉ trả danh sách thay thế** (cụm nghe sai → tên), code áp vào bản gốc. Thay thế chỉ được áp khi cụm có trong bản ghi, tên đích nằm trong danh sách tên/alias, và hai cách viết đọc gần nhau: `nameSimilarity` (bỏ dấu, hoa thường, khoảng trắng; khoảng cách chỉnh sửa) ≥ **0,6**. Mọi thay thế sai đo được có điểm ≤ 0,58.
- So 6 model với cùng bộ lọc (video có transcript khớp tên, trước khi sửa: 36/74): gpt-4.1-mini 52, gpt-4.1 55, gemini-3.6-flash 57, gpt-5.5 58, claude-sonnet-4-6 58, deepseek-v4-flash 58. Sonnet, DeepSeek và gpt-4.1-mini tự đề xuất thay thế sai (Trellia Cove, "the Park Vista"), bộ lọc chặn được; gpt-5.5 và gemini-3.6-flash thì không.

**Quyết định**
- Model **gemini-3.6-flash**, ngưỡng 0,6 (`TRANSCRIPT_CORRECTION_CONFIG`, `lib/transcripts`). Chỉ sửa transcript tiếng Việt.
- Danh sách tên của một nguồn = tên và alias của mọi đối tượng thuộc các project theo dõi nguồn đó. Nguồn chưa có project nào theo dõi thì không sửa.
- Kết quả lưu trong phần tử transcript của `media`: `text` là bản đã sửa, `rawText` là bản ASR (chỉ khi khác), `correction: { model, signature, replacements, correctedAt }`. `signature` gồm phiên bản prompt, model, ngưỡng và danh sách tên; luôn sửa lại từ bản ASR. `content_hash` đổi theo bản đã sửa nên Match và Enrich chạy lại.
- Workflow `collect-source`: khi run thêm item mới, bước `correct-transcripts-{offset}` sửa transcript chưa sửa của run (8 item mỗi bước) **trước bước match**. Lỗi gọi model chỉ để lại bản ASR, đếm vào `collect_runs.stats.transcriptCorrection`.
- Video đã có, hoặc khi project đổi đối tượng hay alias: `npm run transcripts:correct -- -- --project <id> --yes` (bỏ qua bản đã sửa với cùng danh sách tên), rồi chạy match và enrich.
- Test thủ công với model thật (không ghi DB): `npm run test:transcript-correction -- -- --cases` chạy 8 ca lấy từ video thật (tên nghe sai phải được sửa; Trellia Cove, "the Park Vista", "Australia" và tên ngoài danh sách phải giữ nguyên). Chạy lại khi đổi prompt, model hoặc ngưỡng. `--text`/`--file` thử một đoạn bất kỳ, `--video-id` sửa lại một video đã lưu và so với bản sửa đang có.

**Chưa làm**
- Tự sửa lại khi project đổi đối tượng hay alias (hiện chạy script bằng tay).
- Tên địa danh và thương hiệu hay gặp (Mizuki Park, Nam Long) chưa có trong danh sách; cần nơi lưu trong cấu hình project.

## D23 — Cảnh báo qua email (2026-10-23)

**Quyết định**
- Đánh giá `alert_rules` đang bật mỗi giờ (`5 * * * *`, `Asia/Ho_Chi_Minh`), đọc thẳng L3: mention liên quan, cảm xúc hiệu lực, extraction. Không làm `metrics_hourly`. Lượng vẫn nhỏ như D17.
- Cửa sổ `1h` / `24h` / `7d` là khoảng trượt tính từ lúc chạy, so với khoảng liền trước cùng độ dài. Một quy tắc chỉ ghi một lần mỗi giờ, mỗi ngày theo timezone của project, hoặc mỗi khối 7 ngày. Bài lan rộng (`mentions.kind = post`, đăng trong 7 ngày, tương tác = like + comment + share) ghi một lần cho mỗi bài.
- Bỏ qua rule tăng trưởng khi kỳ trước bằng 0 (không có % tăng) hoặc khi số mention dưới `minMentions`. Tỷ lệ tiêu cực dùng số mention đã phân loại làm mức tối thiểu. Từ khóa tìm bằng `strpos` trên `content_items.text`. Giá lệch so `case_config.priceRef` với giá rao `trieu_m2` / `rao_ban` gán đúng một đối tượng primary.
- Chỉ gửi email, qua Resend (`RESEND_API_KEY`, `ALERT_EMAIL_FROM`) tới `notification_config.recipients`. `alert_rules.channels` ghi đè kênh của project; Zalo, SMS, Slack không gửi. Thiếu người nhận hoặc thiếu cấu hình vẫn ghi `alerts` với `status = email_failed`. Lỗi gửi không tự gửi lại; lần chạy sau chỉ gửi nếu bản ghi còn `open` (gửi bị đứt giữa chừng).
- Trang Cảnh báo đọc các lần đã ghi và các rule đang bật. Chạy tay: `npm run alerts:evaluate`.

**Chưa làm**
- Zalo, SMS, Slack, báo cáo AI định kỳ, insight, replay để test cảnh báo.
- `metrics_hourly` và phát hiện bất thường ngoài ngưỡng đã cấu hình.

## D24 — Gỡ pipeline cũ (2026-10-25)

**Quyết định**
- Xóa hẳn pipeline collect/score/classify cũ, không giữ để tham chiếu: `lib/{documents,comments,chunking,classification,scoring,terms,term-backfill,term-digests,document-parts,document-terms,research,retrieval,data-sources,data-source-groups,system-schedules,media-assets,exa,mcp,legacy-import}`, các trang và API tương ứng, webhook `/api/webhooks/bright-data/[sourceRunId]`, và các script `legacy:*`, `chunks:rebuild`, `terms:embed`.
- Không còn hỗ trợ nhập dữ liệu cũ (`legacy:import`) và không sao lưu `pg_dump` trước khi xóa bảng. Dữ liệu đã nhập vào `content_items` (`origin = legacy_import`) được giữ.
- Làm hai PR: PR 1 gỡ code (revert được), PR 2 xóa bảng khỏi schema. Thay D1 (đóng băng): không còn cần mở lại pipeline cũ.
- Giữ `lib/bright-data` (connector mới dùng), `lib/langchain`, `lib/exposers`, khóa API workspace (`lib/unkey`). Khóa API workspace hiện chưa có chỗ dùng sau khi gỡ MCP.
- PR 2 xóa các bảng `documents`, `comments`, `document_parts`, `chunks`, `terms`, `document_terms`, `term_backfill_runs`, `term_digest_daily`, `research_runs`, `dim_dates`, `data_sources`, `data_source_groups`, `data_source_group_members`, `source_runs`, `system_schedules`, `system_schedule_runs`, `workspace_task_runs` và ba cột term của `projects` (kèm form cài đặt term). `workspaces.data_collection_scope`, thẻ cài đặt LLM của workspace và `PATCH /api/workspaces/[id]` bị xóa vì không còn chỗ dùng.

## D25 — Admin chỉnh tần suất thu thập qua UI (2026-10-26)

- Tier của source có hai chế độ, chỉnh ở `/admin/sources/{id}`: **tự động** (tính lại sau mỗi run post như D7) hoặc **thủ công** (`activity_tier_locked`, chọn `hot` / `normal` / `low` / `paused`). `paused` luôn là thủ công. Chuyển về tự động thì tier được tính lại ngay. Không có interval riêng cho từng source.
- Khoảng cách quét theo tier, ngưỡng tier, số ngày đo, khoảng cách của nguồn tìm từ khóa TikTok và các mốc lấy lại comment chỉnh được ở `/admin/settings`. Giá trị mặc định vẫn là `COLLECT_CONFIG`; phần admin đổi lưu ở bảng `app_settings` (mỗi nhóm một dòng, cả nhóm), "Về mặc định" xóa dòng. Không lưu lịch sử thay đổi, chỉ người đổi và thời điểm gần nhất.
- Đổi các mốc lấy lại chỉ có tác dụng từ mốc kế tiếp của mỗi bài; bài đang chờ mốc cũ vẫn đi mốc đó.
- Thêm nhóm setting mới: khai báo một `SettingDefinition` (schema Zod, mặc định, `fields` cho form) cạnh module dùng nó, thêm vào `lib/settings/registry.ts`, đọc bằng `getSettings`. Form được dựng từ `fields`.
- **Giới hạn record theo ngày** (`sources.daily_record_limit`, null = không giới hạn), áp dụng mọi chế độ tier. Ngày tính theo giờ Việt Nam (reset 0h, tức 17:00 UTC); tháng vẫn theo UTC. Ngân sách còn lại = min(còn lại của tháng, còn lại của ngày).
  - Hết ngân sách thì không lên lịch run post và run refresh (như D7). Bài không mất: run post kế tiếp lấy từ bài mới nhất đã lưu, trừ khi phần tồn vượt trần 500 record/run.
  - **Run comment cũng bị chặn** (D7 chưa chặn), cả khi bài vào kho lẫn tại mốc refresh: mỗi bài ước tính `min(num_comments, 150)` record, ưu tiên bài nhiều comment nhất; bài không vừa ngân sách được xét lại ở mốc kế tiếp (qua mốc cuối thì không lấy). Số bài bị hoãn ghi vào `collect_runs.stats.commentsDeferredForBudget`.
  - Giới hạn mềm: run đã khởi tạo vẫn chạy hết, nên có thể vượt một ít. Run chạy tay (CLI) không bị chặn.
  - **Lý do:** usage thật 7 ngày (2026-10-20 → 26): comment chiếm 70–90% record; ngày lấy lần đầu một group lên tới ~10.000 record so với 600–1.000 ngày thường. Giới hạn tháng không ngăn một đợt đột biến tiêu hết ngân sách trong vài ngày; giới hạn ngày (gợi ý 2–3 lần mức thường) chặn được. Không làm giới hạn record mỗi run: hạ trần chỉ làm mất bài cũ hơn trong cửa sổ, không tiết kiệm thật.
- **Lý do:** Bright Data tính tiền theo record nên giảm tần suất quét Facebook ít tiết kiệm (cùng số bài); công cụ chặn chi phí là `monthly_record_limit`. Hạ tier có ích cho nguồn ít quan trọng và cho TikTok (tính theo request). Hạ tier của nguồn đông bài có thể chạm trần 500 record/run và sót bài; tooltip và form cảnh báo khi số bài dự kiến mỗi run vượt trần.

## D26 — Report case Uy tín chủ đầu tư (2026-10-26)

- Trang riêng của case `brand` là **Chỉ số uy tín** (`/api/metrics/brand-case`), bố cục theo demo Phát Đạt: chỉ số uy tín và các trụ cột, cảm xúc theo từng dự án, Share of Voice, chỉ số uy tín theo kỳ báo cáo. Overview dùng 6 KPI chung (đề cập, tương tác, tác giả, NSS, SoV, tỷ lệ tiêu cực; reach bỏ như D17) và thêm ba widget đầu, trỏ sang trang Chỉ số uy tín. AI tóm tắt và Báo cáo AI giữ nội dung mẫu như case Theo dõi dự án.
- **Trụ cột** là mọi khía cạnh của project (template có 5, người dùng sửa được). Điểm trụ cột = (NSS của khía cạnh + 100) / 2, thang 0–100, chỉ tính khi khía cạnh có ít nhất `reputationMinMentions` (5) đề cập có cảm xúc. **Chỉ số uy tín** = trung bình không trọng số các trụ cột có điểm. Nhãn: từ 70 tốt, 55 khá, 40 trung bình, dưới 40 yếu. Cảm xúc theo khía cạnh lấy như D17.
- **Phía chủ đầu tư** là các đề cập Enrich gán cho chủ đầu tư hoặc dự án của chủ đầu tư (`mention_entities`). Đề cập nhắc cả chủ đầu tư và đối thủ tính cho chủ đầu tư, vì cảm xúc gán cho cả đề cập. Điểm của một đối thủ chỉ tính trên đề cập nhắc riêng đối thủ đó. Đề cập chưa gán được đối tượng, hoặc nhắc nhiều đối thủ mà không nhắc chủ đầu tư, không tính cho bên nào.
- **Cảm xúc theo dự án**: NSS theo cảm xúc riêng của từng entity `product` (`mention_entities.sentiment`).
- **Share of Voice**: đề cập nhắc dự án của chủ đầu tư được tính cho chủ đầu tư, cả trên ô KPI của Overview. Biểu đồ tròn đếm đề cập theo từng chủ đầu tư; đề cập nhắc nhiều bên được tính cho mỗi bên.
- **Xu hướng**: 6 kỳ gần nhất theo `caseConfig.period` (tuần, tháng, quý), kỳ cuối đang chạy, không phụ thuộc khoảng ngày đang chọn. Đường so sánh là trung bình chỉ số của các đối thủ có điểm trong kỳ. Kỳ không đủ dữ liệu để trống, không nối.
- **Report chung chỉ đếm đề cập của bên mình** (mọi case): Overview (trừ SoV), Cảm xúc, Kênh, Tác giả, trang Chủ đề, câu hỏi người mua và radar khía cạnh của project, thẻ project và tổng quan workspace chỉ tính đề cập Enrich gán cho ít nhất một entity không phải `competitor` (`lib/mentions/utils/own-mention-sql.ts`). Đề cập chỉ về đối thủ chỉ dùng cho SoV và phần so sánh; đề cập chưa rõ nói về ai không được tính, kể cả đề cập chưa chạy Enrich. Chưa đổi: cảnh báo, danh sách đề cập (Luồng thảo luận, Quản lý đề cập), gom chủ đề.
  - **Lý do:** project Trần Anh Group (2026-10-26) có 34 đề cập, tất cả vào qua truy vấn của đối thủ Nam Long Group; biểu đồ đề cập theo ngày cũng như KPI đang vẽ thảo luận về đối thủ.
- **Enrich gán đối tượng chỉ trong các entity Match đã khớp** (`mentions.matched_entity_ids`; đề cập thêm tay không có thì giữ kết quả LLM), và prompt nói rõ vai trò không phải điều kiện để gán (`entities` v8). Trước đó LLM gán bình luận khen Khang Điền (không theo dõi) cho Trần Anh Group vì cùng vai trò "Chủ đầu tư"; chỉ sửa prompt chưa đủ. Đã chạy lại Enrich `entities` cho mọi project.
- Gỡ `LEGACY_PROJECT_CASES` và `scripts/migrate-project-cases.ts`: DB chỉ còn id case BĐS (kiểm ngày 2026-10-26).

## D27 — MCP và scope của API key (2026-10-26)

- MCP chạy ở `/api/mcp` (Streamable HTTP, stateless), xác thực `Authorization: Bearer <key>` qua Unkey. Chat agent ở repo khác gọi cùng endpoint này. Lớp tool nằm ở `lib/ai-tools/`, dùng chung cho MCP và chat agent; tool chỉ gọi service trong `lib/metrics/`, `lib/mentions/`, `lib/projects/`, không viết SQL riêng.
- **Key thuộc workspace, có scope và danh sách project**, không làm key theo project. `workspace_api_keys` thêm `scopes` (`reports:read`, `mentions:read`, `projects:write`), `project_ids` (null là mọi project của workspace) và `created_by`.
  - **Lý do:** MCP tạo project là thao tác cấp workspace, key theo project không làm được; key workspace không giới hạn thì không đưa được cho người chỉ nên đọc một project.
- Mỗi tool khai báo scope cần có (`reports:read` cho số liệu, `mentions:read` cho `search_mentions`; `list_projects`, `get_project` mọi key đều dùng được). MCP chỉ đăng ký tool mà key được phép, nên model không thấy tool ngoài quyền. Key mới mặc định hai scope đọc; `projects:write` hiện trong form nhưng chưa chọn được đến khi có tool tạo project.
- Key cũ tạo trước D27 không có `created_by`: chạy với quyền chủ workspace và hiện "Key cũ" trong danh sách (DB dev có 2 key như vậy, kiểm ngày 2026-10-26). Tạo lại key để gắn người tạo.
- Unkey chỉ xác thực và rate limit; quyền đọc từ DB, đổi scope không cần tạo lại key. Mỗi lần gọi kiểm lại quyền của `created_by` trong workspace (`assertWorkspaceAccess`): người rời workspace thì key của họ hết tác dụng. Thao tác ghi ghi nhận là của người đó.
- Thẻ API key ở workspace settings thêm chọn scope và project. Nhóm menu Dự án thêm mục **Kết nối AI**: URL MCP, các key truy cập được project, tạo key chỉ đọc cho project đang xem, đoạn config mẫu.
- Bản đầu chỉ Bearer key. claude.ai web và ChatGPT cần OAuth, để sau. Chat widget trong app dùng token ngắn hạn đổi từ phiên đăng nhập, làm khi làm widget.
- MCP tạo project dùng cùng schema zod và `createProjectWithConfig` với wizard, có `dry_run` để agent cho người dùng xem lại trước khi tạo.
  - Input của `create_project` gọn cho model: case, tên, đối tượng (vai trò, tên, alias, từ loại trừ), nguồn, `caseConfig`, khía cạnh và email nhận tùy chọn. Tool tự sinh id, lấy khía cạnh và cảnh báo mặc định của case, email nhận mặc định là email người tạo key (như wizard). `dryRun` mặc định true, trả tóm tắt cấu hình và số khớp thử (`previewMatches`).
  - Cần scope `projects:write`, key dùng cho mọi project, và người tạo key còn quyền `edit` workspace lúc gọi.
  - Tool hỗ trợ: `list_case_templates` (vai trò, khía cạnh, JSON Schema của `caseConfig`), `list_sources` (lọc không dấu theo tên, URL), `preview_project_match`.

## D28 — Kỳ báo cáo và L4 theo ngày (2026-10-26)

- **Hai loại kỳ:** kỳ cuộn (7/14/30 ngày trọn, tính cả hôm nay) cho dashboard; kỳ lịch (`week` thứ 2–chủ nhật, `month`, `quarter`, `year`) cho báo cáo. Tất cả theo `projects.timezone`. Kỳ so sánh: kỳ liền trước; báo cáo tháng và năm thêm cùng kỳ năm trước. `loadReportWindow(projectId, days)` đổi thành một hàm resolve kỳ trả `{ start, end, previousStart }`; service metrics nhận khoảng ngày thay cho `days`.
- **`project_metrics_daily`** khóa `(project_id, date_key, source_id)`, `date_key` theo timezone project; lưu `mentions`, `posts`, `engagement`, `positive`, `neutral`, `negative`, `unknown`, `emotions` của đề cập bên mình (D26, đã khử trùng), cùng `sov_primary`, `sov_tracked` (đề cập liên quan nhắc primary/product, và nhắc bất kỳ đối tượng theo dõi). **`project_aspect_daily`** khóa `(project_id, date_key, aspect_id)`, lưu `mentions`, `positive`, `neutral`, `negative` theo khía cạnh hiệu lực (D14). Mọi kỳ (cuộn, lịch, tùy chọn) là sum trong khoảng `date_key`.
  - Chỉ lưu số đếm. NSS, tỷ lệ tiêu cực, SoV, tỷ lệ theo khía cạnh tính từ tổng lúc đọc; không lấy trung bình tỷ lệ theo ngày.
  - Sửa khi làm (2026-10-26): bỏ chiều `entity_id`. SoV cần số đề cập khác nhau nhắc *bất kỳ* đối tượng bên mình, không cộng được từ dòng theo từng entity, nên lưu thẳng hai cột SoV. Không cộng các aspect lại thành tổng đề cập.
  - Đọc L4: Tổng quan (KPI, đề cập theo ngày, nguồn), Cảm xúc (theo ngày, emotion, khía cạnh), Kênh (theo kênh, nguồn). Vẫn đọc L3: số tác giả khác nhau (không cộng qua ngày được), bản đồ nhiệt giờ × thứ, trang Tác giả, chủ đề, danh sách mention, trang riêng theo case (giá, câu hỏi người mua, chỉ số uy tín theo entity) và cảnh báo.
  - Tương tác gắn vào ngày đăng của mention, lấy số mới nhất lúc tính.
- **Tính lại theo (project, ngày)** (`refreshProjectMetricsDaily`): một câu lệnh upsert các dòng của những ngày đó và xóa dòng không còn đề cập, idempotent, hai lần chạy cùng lúc không nhân đôi dòng (khóa unique, `source_id` NULLS NOT DISTINCT); không dùng hàng đợi `is_stale` từng dòng như `term_digest_daily` cũ. Kích hoạt:
  - Cuối mỗi lần Enrich (bước `metrics`): 35 ngày gần nhất, lùi tới đề cập cũ nhất của các thread vừa Enrich (backfill).
  - Gán hay bỏ nhãn tay: ngày của item.
  - Match lại toàn bộ (sau `finalize`): mọi ngày của project. Đổi timezone chưa có chỗ sửa trong UI; khi có thì cũng tính lại cả project.
  - Đổi vai trò đối tượng trong cấu hình: mọi ngày của project, vì vai trò quyết định đề cập bên mình và SoV ở mọi ngày mà không đổi query nên không match lại.
  - Lần thu thập chỉ cập nhật item (`inserted = 0`, `updated > 0`, thường là làm mới like, comment, share): không có Match, Enrich nên workflow `collect-source` tự tính lại các ngày có đề cập của những item run đó vừa ghi (bước `metrics`). Comment về trễ là item mới, đi qua Match rồi Enrich như mọi item.
  - Sửa khi làm (2026-10-26): bỏ job đêm `refresh-metrics-daily` đã định ban đầu. Mọi thay đổi của L3 đều đi qua một trong các bước trên, nên không cần schedule QStash.
  - Backfill: `npm run metrics:refresh -- -- --all`.
  - Hôm nay đọc từ L4 như mọi ngày, không đọc lai L3.
- **Báo cáo AI theo kỳ** (`ai_reports`, khóa `(project_id, period_type, period_start)`): sinh sau khi kỳ đóng có độ trễ 24–48 giờ; số liệu đóng băng trong `metrics_snapshot`, sinh lại tạo phiên bản mới. `REPORT_SCHEDULES` thêm `yearly`.
- Chưa dựng lại `dim_dates`: tuần, tháng, quý, năm dùng `date_trunc`. Thêm khi cần so theo âm lịch hoặc Tết (`lunar_month`, `is_holiday`).

## D29 — Báo cáo AI theo kỳ (2026-10-26)

- **Không duyệt, không email (tạm thời).** Báo cáo là của AI, ghi rõ "tạo tự động", không có trạng thái nháp/đã duyệt. Chưa gửi email; trang Báo cáo AI liệt kê các báo cáo cũ để chọn xem.
- **Kỳ theo `reportSchedule` của project:** `daily` → báo cáo ngày (kỳ `day`, so với ngày trước), `weekly` → tuần (thứ 2–chủ nhật), `monthly` → tháng, `yearly` → năm; `none` không tự tạo. Kỳ `day` thêm vào kỳ lịch (D28). Người dùng tạo được báo cáo cho kỳ bất kỳ, kể cả kỳ đang chạy.
- **Tạo ngay khi kỳ đóng:** job QStash `generate-due-reports` chạy mỗi giờ, tạo báo cáo của kỳ vừa đóng ở lần chạy đầu tiên sau đó, không chờ 24 giờ. Dữ liệu của mấy giờ cuối kỳ có thể chưa thu thập hay Enrich xong; số liệu đóng băng trong snapshot, "Tạo lại" cập nhật khi dữ liệu trễ đã về.
- **Job mỗi giờ:** `generate-due-reports` tìm, cho từng project, kỳ gần nhất của lịch đã kết thúc theo timezone project mà chưa có báo cáo (project chưa lưu lịch dùng mặc định `weekly` như trang cài đặt hiện), rồi đẩy một job QStash `generate-report` cho mỗi báo cáo. Mỗi lần gọi model chạy trong request riêng, lỗi được QStash thử lại riêng; flow control giữ tối đa 2 báo cáo chạy cùng lúc. Chỉ tạo kỳ vừa đóng, không bù các kỳ cũ hơn. `npm run reports:due -- -- --dry-run | --yes | --run`.
- **Một báo cáo mỗi `(project_id, period_type, period_start)`**; tạo lại ghi đè, giữ `generated_at` mới.
- **Nội dung** theo demo: tóm tắt điều hành; số liệu chính do hệ thống tính từ snapshot (KPI L4 và số liệu riêng theo case), AI không viết số này; điểm nổi bật, rủi ro (mỗi mục trích 1–3 đề cập), khuyến nghị.
- **Cách sinh:** snapshot số liệu kỳ và kỳ so sánh (tổng quan, cảm xúc, kênh, chủ đề, số liệu case) cùng khoảng 100–150 đề cập mẫu (tương tác cao, tiêu cực, theo chủ đề và khía cạnh), mỗi đề cập gắn nhãn `[M1]…`. LLM (`REPORT_CONFIG.model`) viết từng phần bằng structured output và trích theo nhãn; hệ thống đổi nhãn sang `mention_id`, bỏ nhãn sai. Mọi con số trong lời văn phải có trong snapshot; sai thì thử lại một lần, vẫn sai thì lưu kèm cảnh báo. Đề cập được trích lưu kèm đoạn trích để báo cáo đọc được dù đề cập đổi sau đó.
- **MCP:** `list_reports`, `get_report` (scope `reports:read`).
- **Chia PR:** 5a bảng, bộ sinh, script, MCP; 5b trang Báo cáo AI và AI tóm tắt ở Tổng quan; 5c job `generate-due-reports`.

## D30 — Một project theo dõi một chủ thể; so sánh là case riêng (2026-10-27)

- **Mỗi project theo dõi đúng một chủ thể** (dự án, chủ đầu tư, khu vực). Bỏ entity đối thủ khỏi mọi case. Mention liên quan (`is_relevant`) là mention về chủ thể; sentiment, emotion, khía cạnh và extraction đều tính theo chủ thể đó.
  - **Lý do:** gán đề cập cho nhiều entity trong cùng project sinh ra nhiều quy tắc gán khác nhau (D26: phía mình, "chỉ nhắc đúng một đối thủ", báo giá bỏ khi nhắc nhiều bên), sentiment của cả đề cập bị dùng cho cả hai phía, và "TB đối thủ" của case dự án thực ra là số gộp mọi đối thủ. Một chủ thể mỗi project thì không cần quy tắc gán.
- **Vai trò entity** còn `subject` (đúng 1, thay `primary`) và `product` (chỉ case `brand`, 0–20: dự án của chủ đầu tư, là thành phần của chủ thể, không phải phía khác). Bỏ `competitor`, `person`, `area`. Case `market` theo dõi một khu vực: khu vực là `subject`.
- **Thuộc tính chủ thể ở `caseConfig`** (tỉnh, phân khúc, giai đoạn, giá tham chiếu): mỗi project một chủ thể nên `caseConfig` chính là thuộc tính của chủ thể, không thêm cột cho entity.
- **Sentiment hướng vào chủ thể:** prompt của enricher `sentiment` hỏi thái độ của người viết với chủ thể (case `brand`: chủ đầu tư và các dự án của họ). Cùng một bài nhắc hai dự án có sentiment khác nhau ở hai project. Enricher `entities` chỉ còn ở case `brand`, cho cảm xúc theo từng dự án của chủ đầu tư.
- **Bỏ lọc "đề cập bên mình"** (D26, `ownMentionSql`): report chỉ lọc theo `is_relevant`. `project_metrics_daily` bỏ `sov_primary`, `sov_tracked`; Overview bỏ ô Share of Voice. Thay phần D26 về phía chủ đầu tư, SoV và đường so sánh đối thủ; phần D28 về cột SoV.
- **So sánh là một case riêng, chỉ đọc** (làm sau): project so sánh chọn 2–4 project đã có cùng case, không có nguồn, truy vấn, enricher, không thu thập, không Match, không L4. Report so sánh gọi report của từng project rồi trả series theo project; trung bình do UI tính bằng hàm dùng chung. Chỉ so khía cạnh trùng key. Lúc tạo cảnh báo khi khía cạnh không trùng hoặc timezone lệch (lệch thì ghép theo `date_key`), không xét nguồn của từng project. Làm `project` và `brand` trước; báo cáo AI theo kỳ và MCP cho project so sánh để sau.
- **Chấp nhận trùng lặp:** bài nhắc hai dự án là hai mention ở hai project và được Enrich hai lần. Kho thô vẫn dùng chung.
- **Không chuyển dữ liệu:** xóa mọi project cũ (`npm run projects:delete-all`) rồi tạo lại theo vai trò mới.
- **Chia PR:** PR1 mô hình một chủ thể (bỏ đối thủ ở template, Enrich, metrics, cảnh báo, UI); PR2 report service theo từng box của trang (thay service theo section); PR3 case so sánh.

## D31 — Report service theo từng box (2026-10-27)

- **Mỗi box của trang report là một report** (`lib/metrics/services/reports/`), không còn service theo section (`getOverviewMetrics`, `getSentimentMetrics`… và `/api/metrics/{section}`). 18 report: `kpis`, `sentiment-breakdown`, `sentiment-trend`, `emotions`, `aspect-sentiment`, `channel-breakdown`, `source-ranking`, `posting-heatmap`, `topics`, `keywords`, `top-authors`, `author-tiers`, `price-trend`, `price-distribution`, `buyer-questions`, `reputation-index`, `reputation-trend`, `product-sentiment` (`REPORT_KEYS`).
  - **Lý do:** section là cách chia của UI. Bố cục đổi (Overview, bento grid, báo cáo AI, MCP) thì chỉ đổi danh sách report, không viết lại service.
- **Một request cho cả trang:** `POST /api/metrics/reports` nhận kỳ và danh sách `{ key, params }`, trả kết quả theo đúng thứ tự (`getReports`, hook `useReports`). Ngữ cảnh chung (kỳ, timezone, case, `caseConfig`, chủ thể, product, enricher đang chạy) resolve một lần (`getReportContext`), rồi các report chạy song song.
- **Tham số theo report** (`REPORT_PARAMS_SCHEMAS`): hiện chỉ `limit` cho các bảng xếp hạng (nguồn, chủ đề, từ khóa, tác giả, câu hỏi), để Overview lấy top 6 còn trang chi tiết lấy đủ.
- **Availability thay cho lỗi:** report trả `{ key, availability, data }`. `needs_enricher` khi enricher nó đọc không chạy (giá cần `price_quote`, câu hỏi cần `buyer_question`), `needs_products` khi brand chưa có dự án, `not_in_case` cho chỉ số uy tín ngoài case `brand`. Dựa vào dữ liệu project có thay vì tên case khi được, để case mới có ngay các box mà dữ liệu cho phép.
- Trang Chủ đề dùng `topics` và `keywords` (bỏ `/api/topics/report`). Snapshot báo cáo AI (D29) lưu theo report (`REPORT_SNAPSHOT_REPORTS`). Tool MCP giữ tên cũ, bên trong gọi `getReports` và trả mỗi report theo key, report không có số liệu trả `{ unavailable }`.
- Số liệu không đổi: so từng box với service cũ trên cùng project (TT Genesis, kỳ 7/14/30 ngày, chạy liền nhau) khớp toàn bộ.
