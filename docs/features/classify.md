# Classify

Gán mỗi tài liệu vào một hoặc nhiều **term** (từ khóa/nhãn) bằng LLM.

## Terms

Term là từ khóa hoặc nhãn ngắn gọn — không phải danh mục chủ đề cố định. Admin có thể quản lý danh sách; tên term là duy nhất trong workspace.

**Quy tắc tạo term** (`term_criteria` trong workspace settings) là nguồn chính định nghĩa term mới. Đề xuất của LLM phải tuân theo quy tắc, và **có thể trả về 0 term** nếu tài liệu không đáng gắn nhãn.

Khi LLM judge quyết định một đề xuất là term mới (`new`) và auto-create bật, term mới được tạo và gán ngay cho tài liệu — không có bước duyệt.

Workspace settings còn có **phạm vi thu thập** (`data_collection_scope`) và **ngôn ngữ term** (Tiếng Việt, English, Auto). Prompt hệ thống (Tiếng Việt) được build từ các setting này.

Mỗi term có một **embedding** (`terms.embedding`, `text-embedding-3-small`, embed chuỗi `tên: mô tả`) dùng để đối chiếu đề xuất của LLM với term hiện có. Embedding được tính khi tạo/sửa term (admin hoặc classifier); term chưa có embedding sẽ không được xét làm ứng viên cho tới khi chạy `npm run terms:embed`.

## Classification flow

Classifier **không** đưa toàn bộ danh sách term vào prompt — chi phí và độ chính xác không phụ thuộc số term trong workspace.

1. Chỉ chạy khi tài liệu có ít nhất một **part** đủ điểm (xem [Score](./score.md)). Tài liệu không có part nào đủ điểm bị `rejected` và không được gán term LLM. LLM chỉ đọc **các part đủ điểm** — phần văn bản nguyên văn cộng tóm tắt của từng ảnh/video đủ điểm (`[Hình ảnh N]: …`). Nội dung không được index thì không được dùng để gán term.
2. **Propose** — LLM đề xuất 0..10 term (tên kiểu từ khóa + mô tả ≤ 150 ký tự) mô tả tài liệu, theo quy tắc workspace. Prompt kèm tên của tối đa 30 term đang dùng nhiều nhất trong workspace làm gợi ý từ vựng, để đề xuất dùng đúng tên term cũ khi khớp.
3. **Embed & tìm ứng viên** — mỗi đề xuất được embed; với mỗi đề xuất lấy tối đa 5 term gần nhất theo cosine similarity, chỉ giữ term có similarity ≥ 0.6. Ứng viên được giữ **theo từng đề xuất**, không gộp chung.
4. **Judge** — LLM đọc tài liệu và từng đề xuất **kèm nhóm ứng viên của riêng nó** (tên, mô tả, similarity), rồi trả đúng một quyết định cho mỗi đề xuất:
   - `existing` — tài liệu nói về một term hiện có trong nhóm → gán term đó (theo id) với confidence.
   - `new` — tài liệu nói về đề xuất, không term nào trong nhóm cùng nghĩa → đáng tạo term mới.
   - `skip` — đề xuất quá hẹp, quá chung, chỉ nhắc lướt, hoặc không đáng là term.

   Judge là bước quyết định duy nhất cho cả việc gán term có sẵn **và** việc tạo term mới; similarity chỉ dùng để lọc ứng viên và cho quy tắc cứng bên dưới. Prompt judge kèm **quy tắc tạo term** của workspace để quyết định `new` bám theo quy tắc.
5. **Kiểm tra kết quả judge** (code, `resolve-proposal-decisions.ts`):
   - `existing` phải trỏ tới id trong nhóm ứng viên của **chính đề xuất đó**; id lạ → `skip` (hoặc gán ứng viên tốt nhất nếu nó là near-duplicate).
   - `new` bị ép thành `existing(ứng viên tốt nhất)` khi ứng viên tốt nhất có similarity ≥ 0.9 — gần đến mức đó là cách gọi khác của term cũ, không tạo bản sao.
   - `skip` luôn được tôn trọng; đề xuất không có quyết định → `skip`.
   - Hai đề xuất cùng trỏ về một term → gán một lần, lấy confidence cao nhất.
6. **Gán & tạo** — mọi `existing` được gán ngay. Với `new` (chỉ khi auto-create bật): tên trùng chính xác với term có sẵn (vd. term admin tạo chưa có embedding) thì gán term đó; ngược lại tạo term mới cùng embedding của đề xuất và gán, confidence lấy từ judge. Auto-create tắt → `new` bị bỏ.

Các ngưỡng nằm trong `lib/classification/config.ts`.

### Ví dụ một lần classify

Bài post trong group Facebook "Airbnb Hosts Vietnam":

> **Mùa này khách hủy nhiều quá** — Mình đang chạy 3 căn ở Đà Lạt, mùa mưa vắng khách nên hạ giá 30% mà vẫn bị hủy liên tục. Đang lo mất Superhost vì tỉ lệ hủy... Có ai áp dụng chính sách hủy nghiêm hơn không? Sáng nào mình cũng pha cà phê mời khách mà cũng chẳng giữ được ai.

**Bước 2 — Propose** trả về 4 đề xuất:

| # | Tên | Mô tả |
|---|-----|-------|
| 0 | Giá phòng theo mùa | Điều chỉnh giá theo mùa cao điểm và thấp điểm |
| 1 | Superhost | Tiêu chí và cách duy trì huy hiệu Superhost |
| 2 | Khách hủy phòng | Xử lý và chính sách khi khách hủy đặt phòng |
| 3 | Cà phê sáng | Chủ nhà mời khách cà phê buổi sáng |

**Bước 3 — Ứng viên** (term hiện có gần nhất, similarity ≥ 0.6):

| # | Ứng viên (similarity) |
|---|-----------------------|
| 0 | Dynamic pricing (0.84), Mùa cao điểm (0.71) |
| 1 | Superhost (0.96) |
| 2 | — không có |
| 3 | Đón tiếp khách (0.63) |

**Bước 4 — Judge** nhận user message dạng:

```text
Các term được đề xuất cho tài liệu, kèm term hiện có gần nghĩa nhất (nếu có).
Với mỗi đề xuất, trả đúng MỘT quyết định: existing (gán term hiện có trong nhóm), new (tạo term mới) hoặc skip (bỏ qua).

Đề xuất #0
  Tên: Giá phòng theo mùa
  Mô tả: Điều chỉnh giá theo mùa cao điểm và thấp điểm
  Term hiện có gần nghĩa:
  - id: a1…  (độ tương đồng 0.84)
    Tên: Dynamic pricing
    Mô tả: Chiến lược giá linh hoạt
  - id: a2…  (độ tương đồng 0.71)
    Tên: Mùa cao điểm

Đề xuất #1
  Tên: Superhost
  Mô tả: Tiêu chí và cách duy trì huy hiệu Superhost
  Term hiện có gần nghĩa:
  - id: b1…  (độ tương đồng 0.96)
    Tên: Superhost
    Mô tả: Huy hiệu Superhost của Airbnb

Đề xuất #2
  Tên: Khách hủy phòng
  Mô tả: Xử lý và chính sách khi khách hủy đặt phòng
  Term hiện có gần nghĩa: (không có)

Đề xuất #3
  Tên: Cà phê sáng
  Mô tả: Chủ nhà mời khách cà phê buổi sáng
  Term hiện có gần nghĩa:
  - id: c1…  (độ tương đồng 0.63)
    Tên: Đón tiếp khách
    Mô tả: Trải nghiệm check-in và tiếp đón

Tài liệu:
Loại: post
Nguồn: Airbnb Hosts Vietnam
Tiêu đề: Mùa này khách hủy nhiều quá
Nội dung:
Mình đang chạy 3 căn ở Đà Lạt, ...
```

và trả về:

```json
{
  "decisions": [
    { "proposalIndex": 0, "decision": "existing", "termId": "a1…", "confidence": 0.85 },
    { "proposalIndex": 1, "decision": "new",      "termId": null,  "confidence": 0.9 },
    { "proposalIndex": 2, "decision": "new",      "termId": null,  "confidence": 0.95 },
    { "proposalIndex": 3, "decision": "skip",     "termId": null,  "confidence": 0 }
  ]
}
```

**Bước 5 — Kiểm tra** (`resolveProposalDecisions`):

| # | Judge | Kết quả cuối | Lý do |
|---|-------|--------------|-------|
| 0 | existing a1 | **existing** Dynamic pricing (0.85) | id nằm trong nhóm của #0 → hợp lệ. Không tạo "Giá phòng theo mùa" trùng nghĩa. |
| 1 | new | **existing** Superhost (0.9) | Quy tắc cứng: ứng viên tốt nhất 0.96 ≥ 0.9 → ép về term cũ dù judge nói `new`. |
| 2 | new | **new** Khách hủy phòng (0.95) | Không ứng viên, judge xác nhận là chủ đề chính → tạo. |
| 3 | skip | **skip** | Chi tiết đời thường, không đáng là term. Flow cũ sẽ tạo "Cà phê sáng" vì 0.63 < 0.9 và judge không chọn "Đón tiếp khách". |

**Bước 6 — Ghi DB** (auto-create bật):

- `document_terms`: gán `Dynamic pricing` (0.85) và `Superhost` (0.9), `assigned_by = llm_classifier`.
- `findTermByName("Khách hủy phòng")` không thấy → tạo term mới với embedding của đề xuất #2, `created_by = llm_classifier`, `source_document_id` = bài này; gán với confidence 0.95.
- Kết quả: `assignments = [Dynamic pricing, Superhost]`, `createdTerms = [Khách hủy phòng]`.

Nếu auto-create tắt, #2 bị bỏ và tài liệu chỉ có 2 term. Nếu đây là tài liệu `discussion`, #2 cũng bị bỏ (không tạo term từ bình luận).

## Discussion documents

Tài liệu `discussion` (gom các bình luận đáng giá của một bài post) được gắn term theo hai nguồn, gộp lại:

1. **Kế thừa từ bài gốc** (`assigned_by = parent_mirror`) — mọi term của post được copy sang discussion. Khi term của post thay đổi (classify lại, backfill, admin gán), chỉ các row `parent_mirror` được thay; term riêng của discussion giữ nguyên.
2. **Tự phát hiện** (`assigned_by = llm_classifier`) — chạy cùng flow propose → embed → judge trên nội dung thảo luận (kèm tiêu đề + trích đoạn bài gốc làm ngữ cảnh), nhưng chỉ giữ quyết định `existing`. Quyết định `new` bị bỏ — **không** tạo term mới từ nội dung bình luận.

3. **Backfill** (`assigned_by = term_backfill`) — khi admin chạy backfill cho một term, discussion được quét như mọi tài liệu khác, nên thảo luận có thể nhận term mà bài gốc không có. Backfill không bao giờ gỡ row `admin` hoặc `parent_mirror`.

Pipeline classify discussion chạy lại khi:

- **Nội dung discussion đổi** (bình luận mới được chấm là đáng giá) — `process-document` trên discussion.
- **Post được classify** (nội dung bài gốc đổi, hoặc admin classify lại post) — classify post xong thì classify lại discussion, để term riêng và `parent_mirror` khớp nội dung/term mới của bài gốc.

Mỗi lần đó: xóa mọi assignment **trừ `admin`**, gắn lại theo nguồn 1 và 2. Term admin gán tay trên discussion không bao giờ bị tự động thay đổi.

**Đếm trong digest:** post và discussion của nó được tính là **một** tài liệu cho mỗi term (`doc_count`). Nếu cả hai cùng có term, lấy post; nếu chỉ discussion có, lấy discussion.

## Admin review

- Xem term do LLM tạo trong danh sách terms (badge **Classifier**).
- **Merge / rename** — gộp trùng hoặc chỉnh tên cho phù hợp quy tắc.

Mỗi term auto-create lưu `source_document_id` — tài liệu kích hoạt việc tạo term.

## Classification confidence

Mỗi gán term có confidence từ LLM judge (0.0–1.0) — là đánh giá mức tài liệu thực sự nói về term, không phải similarity giữa đề xuất và term. Gán confidence thấp admin có thể review. Term auto-create (hoặc trùng tên chính xác) cũng lấy confidence của quyết định `new` từ judge.
