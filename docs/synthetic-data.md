# Synthetic data

Dữ liệu giả, sinh từ connector ảo hoặc LLM. Có hai mục đích:

1. **Test phần phân tích**: biết trước đáp án đúng (sentiment, aspect, entity…) nên đo được độ chính xác của Match và Enrich.
2. **Test độ nhạy của social với thông tin công bố**: giả lập phản ứng của cộng đồng sau một sự kiện (mở bán, đính chính, tin đồn, thay đổi chính sách), rồi kiểm tra dashboard và cảnh báo có phản ánh đúng, đủ nhanh hay không.

## Cách hoạt động

- Dữ liệu giả **ghi thẳng vào kho thô** (`sources`, `authors`, `content_items`, `engagement_snapshots`) với `origin = synthetic` và `scenario_id`. Không có payload trên R2.
- Từ bước Match trở đi, dữ liệu giả đi **cùng pipeline** với dữ liệu thật. Không có nhánh code riêng.
- Chỉ project `mode = sandbox` mới thấy dữ liệu giả (xem [data-model.md](data-model.md#nguồn-gốc-dữ-liệu-origin)).

## Scenario

**`scenarios`**: mô tả một kịch bản.
- `workspace_id`, `name`, `description`
- `timeline`: các sự kiện công bố, mỗi sự kiện có thời điểm, nội dung và kênh công bố
- `audience`: thành phần người tham gia (KOL, sàn, nhà đầu tư, khách hàng…) và tỷ lệ
- Tham số phản ứng: mức lan truyền, độ trễ, tỷ lệ cảm xúc theo từng nhóm, các luận điểm chính
- `seed`, `model`, `prompt_version`: để sinh lại đúng như cũ
- `status`, `generated_at`

**`synthetic_labels`**: đáp án đúng cho mỗi item giả.
- `content_item_id`, `expected_relevant`, `expected_sentiment`, `expected_emotion`, `expected_entities`, `expected_aspects`, `expected_extractions`

## Connector ảo

Có cùng interface với connector thật để sau này có thể thay thế cho nhau. Có hai chế độ:

- **Batch**: sinh toàn bộ timeline một lần, có `published_at` trải dài theo kịch bản. Dùng để test phân tích và dashboard.
- **Replay**: phát dần từng phần theo thời gian thực hoặc thời gian tua nhanh. Dùng để test cảnh báo và chế độ khủng hoảng.

Sinh dữ liệu theo hai tầng:
1. Code dùng tham số của scenario để quyết định số lượng, thời điểm và phân bổ (tác giả, kênh, cảm xúc).
2. LLM viết nội dung cho từng item theo nhãn đã định, đúng giọng văn của từng nhóm (teencode, viết tắt, mỉa mai…).

Nhãn được quyết định trước khi LLM viết, nhờ vậy `synthetic_labels` đáng tin cậy.

## Đo lường

- **Chất lượng phân tích**: so `mentions` với `synthetic_labels` (precision/recall khi so khớp, độ chính xác sentiment và aspect). Mỗi lần đổi prompt hoặc model thì chạy lại.
- **Độ nhạy**: độ trễ từ sự kiện công bố đến lúc dashboard thể hiện thay đổi hoặc cảnh báo được bắn; có báo sai hay báo sót không.
- Kết quả được lưu theo `enrich_version` và `scenario_id` để so sánh giữa các lần chạy.

## Lưu ý

- LLM viết nội dung có xu hướng "sạch" hơn mạng xã hội thật. Cần trộn thêm nhiễu: lỗi chính tả, nội dung không liên quan, spam, các ca trùng tên (ví dụ "La Pura" là nước hoa).
- Kết quả trên dữ liệu giả không thay thế được bộ mẫu thật có gán nhãn. Cả hai đều cần.
