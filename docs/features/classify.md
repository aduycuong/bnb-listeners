# Classify

Gán mỗi tài liệu vào một hoặc nhiều **term** (từ khóa/nhãn) bằng LLM.

## Terms

Term là từ khóa hoặc nhãn ngắn gọn — không phải danh mục chủ đề cố định. Admin có thể quản lý danh sách; tên term là duy nhất trong workspace.

**Quy tắc tạo term** (`term_criteria` trong workspace settings) là nguồn chính định nghĩa term mới. LLM chỉ đề xuất khi không khớp term có sẵn, phải tuân theo quy tắc, và **có thể trả về 0 term** nếu không phù hợp.

Khi classifier không khớp term nào và auto-create bật, LLM có thể đề xuất **0 đến nhiều** term mới; term được tạo gán ngay cho tài liệu — không có bước duyệt.

Workspace settings còn có **phạm vi thu thập** (`data_collection_scope`) và **ngôn ngữ term** (Tiếng Việt, English, Auto). Prompt hệ thống (Tiếng Việt) được build từ các setting này.

## Classification flow

1. Sau khi chấm điểm, LLM đọc tài liệu và chọn term khớp (theo id) từ toàn bộ danh sách term hiện có.
2. Nếu có term khớp, gán ngay kèm confidence.
3. Nếu không khớp và auto-create bật, LLM đề xuất 0..N term mới (tên kiểu từ khóa + mô tả) theo quy tắc workspace. Tên đã tồn tại thì gán term đó; tên mới thì tạo và gán.

## Admin review

- Xem term do LLM tạo trong danh sách terms (badge **Classifier**).
- **Merge / rename** — gộp trùng hoặc chỉnh tên cho phù hợp quy tắc.

Mỗi term auto-create lưu `source_document_id` — tài liệu kích hoạt việc tạo term.

## Classification confidence

Mỗi gán term có confidence từ LLM (0.0–1.0). Gán confidence thấp admin có thể review. Term auto-create được gán với confidence 1.0.
