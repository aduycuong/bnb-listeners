# Overview

## Sản phẩm

Ứng dụng social listening: theo dõi **ai nói gì về một đối tượng** (thương hiệu, chủ đầu tư, dự án, đối thủ…), **ở đâu, khi nào, với thái độ nào và lan rộng đến đâu**, rồi biến thành dashboard, cảnh báo và báo cáo.

Mỗi **project** là một case listening (`general`, `campaign`, `crisis`, `competitor`, `market`, `cx`, …). Giao diện demo hiện tại trong `components/projects/demo/` là hình mẫu cho các report cần có.

## Nguyên tắc

1. **Mention là đơn vị trung tâm.** Mọi chỉ số đều đếm và tổng hợp từ mention, bao gồm cả comment.
2. **Kho thô không phụ thuộc project.** Đổi từ khóa hoặc thêm đối thủ thì so khớp lại trên dữ liệu đã có, không cào lại.
3. **Mỗi bước có version và chạy lại được.** Đổi cấu hình hoặc prompt thì tính lại, không phải sửa tay.
4. **Dữ liệu giả là công dân hạng nhất.** Dữ liệu từ connector ảo đi cùng pipeline với dữ liệu thật, được đánh cờ và kèm nhãn đúng để đo chất lượng phân tích.

## Các lớp xử lý

```text
Collect ─► Normalize ─► Match ─► Enrich ─► Aggregate ─► Serve
connector   kho thô      theo      LLM       rollup      dashboard,
thật / ảo                project                         cảnh báo, báo cáo, hỏi AI
```

| Lớp | Việc chính |
|---|---|
| Collect | Connector thật (Bright Data, RSS/Exa, crawler) lưu payload gốc vào R2. Connector ảo ghi thẳng vào kho thô. |
| Normalize | Chuyển payload về `sources`, `authors`, `content_items` và `engagement_snapshots`. |
| Match | Áp truy vấn của project lên kho thô (lọc từ vựng tiếng Việt, sau đó LLM xử lý các ca mơ hồ) để tạo `mentions`. |
| Enrich | Gắn cho mỗi mention: sentiment, emotion, aspect, entity, topic và các trường riêng theo case. |
| Aggregate | Cập nhật tăng dần các rollup theo giờ và theo ngày. |
| Serve | Dashboard theo widget, cảnh báo, báo cáo định kỳ, insight AI có trích dẫn mention. |

Chi tiết bảng: [data-model.md](data-model.md).
