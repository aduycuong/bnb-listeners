# Classify

Gán mỗi tài liệu vào một hoặc nhiều **term** (từ khóa/nhãn) bằng LLM.

## Terms

Term là từ khóa hoặc nhãn ngắn gọn — không phải danh mục chủ đề cố định. Admin có thể quản lý danh sách; tên term là duy nhất trong workspace.

**Quy tắc tạo term** (`term_criteria` trong workspace settings) là nguồn chính định nghĩa term mới. Đề xuất của LLM phải tuân theo quy tắc, và **có thể trả về 0 term** nếu tài liệu không đáng gắn nhãn.

Khi một đề xuất không khớp term nào có sẵn và auto-create bật, term mới được tạo và gán ngay cho tài liệu — không có bước duyệt.

Workspace settings còn có **phạm vi thu thập** (`data_collection_scope`) và **ngôn ngữ term** (Tiếng Việt, English, Auto). Prompt hệ thống (Tiếng Việt) được build từ các setting này.

Mỗi term có một **embedding** (`terms.embedding`, `text-embedding-3-small`, embed chuỗi `tên: mô tả`) dùng để đối chiếu đề xuất của LLM với term hiện có. Embedding được tính khi tạo/sửa term (admin hoặc classifier); term chưa có embedding sẽ không được xét làm ứng viên cho tới khi chạy `npm run terms:embed`.

## Classification flow

Classifier **không** đưa toàn bộ danh sách term vào prompt — chi phí và độ chính xác không phụ thuộc số term trong workspace.

1. Chỉ chạy khi tài liệu có ít nhất một **part** đủ điểm (xem [Score](./score.md)). Tài liệu không có part nào đủ điểm bị `rejected` và không được gán term LLM. LLM chỉ đọc **các part đủ điểm** — phần văn bản nguyên văn cộng tóm tắt của từng ảnh/video đủ điểm (`[Hình ảnh N]: …`). Nội dung không được index thì không được dùng để gán term.
2. **Propose** — LLM đề xuất 0..10 term (tên kiểu từ khóa + mô tả ≤ 150 ký tự) mô tả tài liệu, theo quy tắc workspace. Prompt kèm tên của tối đa 30 term đang dùng nhiều nhất trong workspace làm gợi ý từ vựng, để đề xuất dùng đúng tên term cũ khi khớp.
3. **Embed & tìm ứng viên** — mỗi đề xuất được embed; với mỗi đề xuất lấy tối đa 5 term gần nhất theo cosine similarity, chỉ giữ term có similarity ≥ 0.6. Hợp lại thành danh sách ứng viên ngắn.
4. **Judge** — LLM đọc tài liệu và danh sách ứng viên, chọn term (theo id) thực sự khớp, kèm confidence. Đây là bước quyết định duy nhất cho việc gán term có sẵn; similarity chỉ dùng để lọc ứng viên.
5. **Tạo term mới** (chỉ khi auto-create bật) — đề xuất được coi là "đã có" nếu judge gán một ứng viên của nó, hoặc ứng viên gần nhất có similarity ≥ 0.9 (trùng nghĩa, không tạo bản sao). Đề xuất còn lại: tên trùng chính xác với term có sẵn thì gán term đó (confidence 1.0); ngược lại tạo term mới cùng embedding của đề xuất và gán.

Các ngưỡng nằm trong `lib/classification/config.ts`.

## Discussion documents

Tài liệu `discussion` (gom các bình luận đáng giá của một bài post) được gắn term theo hai nguồn, gộp lại:

1. **Kế thừa từ bài gốc** (`assigned_by = parent_mirror`) — mọi term của post được copy sang discussion. Khi term của post thay đổi (classify lại, backfill, admin gán), chỉ các row `parent_mirror` được thay; term riêng của discussion giữ nguyên.
2. **Tự phát hiện** (`assigned_by = llm_classifier`) — chạy cùng flow propose → embed → judge trên nội dung thảo luận (kèm tiêu đề + trích đoạn bài gốc làm ngữ cảnh), nhưng chỉ gán term có sẵn. **Không** tạo term mới từ nội dung bình luận.

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

Mỗi gán term có confidence từ LLM judge (0.0–1.0) — là đánh giá mức khớp giữa tài liệu và term, không phải similarity giữa đề xuất và term. Gán confidence thấp admin có thể review. Term auto-create (hoặc trùng tên chính xác) được gán với confidence 1.0.
