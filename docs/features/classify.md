# Classify

Gán mỗi tài liệu vào một hoặc nhiều **term** (từ khóa/nhãn) bằng LLM.

## Terms

Term là từ khóa hoặc nhãn ngắn gọn — không phải danh mục chủ đề cố định. Admin có thể quản lý danh sách; tên term là duy nhất trong workspace.

**Quy tắc tạo term** (`term_criteria` trong workspace settings) là nguồn chính định nghĩa term mới. LLM chỉ đề xuất khi không khớp term có sẵn, phải tuân theo quy tắc, và **có thể trả về 0 term** nếu không phù hợp.

Khi classifier không khớp term nào và auto-create bật, LLM có thể đề xuất **0 đến nhiều** term mới; term được tạo gán ngay cho tài liệu — không có bước duyệt.

Workspace settings còn có **phạm vi thu thập** (`data_collection_scope`) và **ngôn ngữ term** (Tiếng Việt, English, Auto). Prompt hệ thống (Tiếng Việt) được build từ các setting này.

## Classification flow

1. Chỉ chạy khi tài liệu có ít nhất một **part** đủ điểm (xem [Score](./score.md)). Tài liệu không có part nào đủ điểm bị `rejected` và không được gán term LLM.
2. LLM đọc **chỉ các part đủ điểm** — phần văn bản nguyên văn cộng tóm tắt của từng ảnh/video đủ điểm (`[Hình ảnh N]: …`) — và chọn term khớp (theo id) từ toàn bộ danh sách term hiện có. Nội dung không được index thì không được dùng để gán term.
3. Nếu có term khớp, gán ngay kèm confidence.
4. Nếu không khớp và auto-create bật, LLM đề xuất 0..N term mới (tên kiểu từ khóa + mô tả) theo quy tắc workspace. Tên đã tồn tại thì gán term đó; tên mới thì tạo và gán.

## Discussion documents

Tài liệu `discussion` (gom các bình luận đáng giá của một bài post) được gắn term theo hai nguồn, gộp lại:

1. **Kế thừa từ bài gốc** (`assigned_by = parent_mirror`) — mọi term của post được copy sang discussion. Khi term của post thay đổi (classify lại, backfill, admin gán), chỉ các row `parent_mirror` được thay; term riêng của discussion giữ nguyên.
2. **Tự phát hiện** (`assigned_by = llm_classifier`) — LLM đọc nội dung thảo luận (kèm tiêu đề + trích đoạn bài gốc làm ngữ cảnh) và chọn term từ danh sách hiện có. **Không** đề xuất/tạo term mới từ nội dung bình luận.

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

Mỗi gán term có confidence từ LLM (0.0–1.0). Gán confidence thấp admin có thể review. Term auto-create được gán với confidence 1.0.
