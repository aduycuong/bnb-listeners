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
- Case cũ được chuyển bằng `npm run projects:migrate-cases`: `general → brand`, `campaign → project`, `competitor → market`, `cx → broker`, `crisis → crisis`. Các case cũ không có trong demo (`reputation`, `trend`, `care`, `employer`…) được chuyển về case gần nhất.
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
- Mỗi lần chạy (workflow `topic-project`, gọi ở cuối `enrich-project`; `npm run topics:project` để chạy tay):
  1. Embed các `topic_hint` mới hoặc đã đổi (`text-embedding-3-small`, bảng `mention_embeddings` kèm hash văn bản). Hint đổi thì mention rời topic cũ và chờ gán lại. Embedding dùng để tìm cặp topic nên gộp và sau này cho hỏi đáp AI.
  2. Gán (`gpt-4.1`): khi có mention mới chờ gán, một lần gọi LLM nhận danh sách topic đang có (`active`, `hidden`) và các hint chờ (mention mới cùng mention chưa có topic trong 30 ngày gần nhất). LLM gom hint vào topic cũ, vào topic mới (cần ≥ 3 mention, kèm `name` và `description`), hoặc để chờ (`topic_status = unassigned`). Nếu có topic mới, hint còn lại được hỏi lần hai, từng hint một, chọn một topic hoặc không: hỏi theo nhóm thì model dồn hint chung về giá vào topic hẹp "Giá bán ảo". Nhiều hint thì chia nhiều lần gọi. `gpt-4.1-mini` gán nhiều hơn nhưng tạo topic rộng như aspect, nên dùng `gpt-4.1` (1–2 lần gọi mỗi lần chạy). Topic "mới" trùng tên (không phân biệt hoa thường, khoảng trắng) với topic `active`/`hidden` đã có, hoặc với topic vừa tạo trong cùng câu trả lời, thì nhận mention vào topic đó thay vì tạo thêm.
  3. Tính lại tâm (trung bình embedding) và số mention có liên quan của mỗi topic.
  4. Gộp: topic `active` cùng tên được gộp thẳng vào topic lớn nhất, không hỏi LLM; sau đó cặp topic có tâm gần nhau được hỏi LLM có phải cùng một chủ đề không; topic nhỏ hơn được gộp vào topic lớn hơn (`status = merged`, `merged_into_id`).
- `topics.aspect_id` (có thể null): aspect chiếm ≥ 40% mention của topic lúc tạo, lấy từ kết quả Enrich, không hỏi thêm LLM.
- Topic có `status`: `active`, `hidden` (người dùng ẩn; vẫn nhận mention để không nổi lên lại thành topic mới), `merged`.
- Người dùng (quyền `edit`) đổi tên, sửa mô tả, ẩn/hiện và gộp topic. Trang Mentions có lọc theo topic. Biểu đồ Topics làm ở giai đoạn 5.
- Mỗi project chỉ chạy một bước của workflow `topic-project` tại một thời điểm (flow control `topics-<projectId>`, parallelism 1). Lần seed lịch sử Lavita (2026-10-15) cho thấy nhiều lần Enrich xong cùng lúc làm các lần chạy topic song song cùng thấy một danh sách topic và một nhóm hint chờ, nên tạo cùng một topic nhiều lần và ghi đè mention của nhau, để lại topic rỗng.
- Các tham số (kích thước topic mới tối thiểu, số ngày hint được chờ, ngưỡng gộp) nằm trong `lib/topics/config.ts`.
- `mention_topics.confidence` = 1 khi LLM gán, độ tương đồng khi gán bằng cách khác về sau.
- Đo: mẫu loại `topic` (mention có topic, gán nhãn "đúng topic hay không") làm sau phần lõi.
