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
- [x] Connector Facebook (page/group, post + comment), viết lại trên nền tích hợp Bright Data và webhook hiện có. Lưu payload gốc lên R2. Xem [D6](decisions.md#d6--luồng-collect-webhook--polling-dự-phòng-2026-10-11)
- [x] Lấy dữ liệu tăng dần theo `since`, bỏ giới hạn cố định 10 bài mỗi lần (`npm run collect:facebook`)
- [x] Script chuyển `documents` + `comments` cũ sang `content_items` (`origin = legacy_import`, `npm run legacy:import`)

**Kết quả:** dữ liệu Facebook thật và dữ liệu cũ nằm trong kho thô mới.

Kiểm chứng sau khi chạy migration:
1. `npm run legacy:import -- --yes`: 1.293 post, 9.707 comment (gồm reply), 5 source.
2. `npm run collect:facebook -- --url <group> --limit 20 --yes`: một `collect_runs` chuyển sang `success`, payload nằm ở `raw/facebook/facebook-posts/...` trên R2, sinh ra các run `facebook-comments` follow-up.

## Giai đoạn 2 — Dữ liệu giả

- [ ] Schema `scenarios`, `synthetic_labels`, cột `origin` và `scenario_id`
- [ ] Connector ảo, chế độ batch
- [ ] 2–3 scenario mẫu dựa trên demo hiện có: uy tín chủ đầu tư, tin đồn lùi bàn giao, mở bán dự án
- [ ] Màn hình đơn giản để tạo scenario và sinh dữ liệu

**Kết quả:** sinh được một timeline giả có nhãn đúng, nằm trong kho thô.

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
