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
| `lib/scenarios/` | Dữ liệu giả: scenario, sinh dữ liệu, nhãn |
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

- Dùng chung bảng kho thô, phân biệt bằng `origin = synthetic` + `scenario_id`. Chỉ project `mode = sandbox` mới thấy. Xem [synthetic-data.md](synthetic-data.md).

## D6 — Luồng collect: chỉ dùng webhook (2026-10-11)

- Mỗi lần thu thập là một dòng `collect_runs`, chạy bằng workflow `collect-source` (`lib/connectors/workflows/collect-source.ts`): start → chờ webhook → normalize theo batch 200 item → finish → tạo run follow-up.
- Bright Data giao kết quả tới `/api/webhooks/connectors/bright-data/{collectRunId}` trên `NEXT_PUBLIC_APP_URL`. Route lưu nguyên payload vào kho payload (L0, hiện là R2) rồi `notify` workflow. Môi trường dev luôn chạy sau tunnel có domain công khai, nên không cần polling. Quá 6 giờ không có webhook thì run bị đánh dấu `failed`.
- `collect_runs.payload_key` là khóa object, không gắn với R2. Mọi lệnh đọc/ghi đi qua `rawPayloadStorage` (`lib/connectors/utils/raw-payload-storage.ts`), nên đổi kho lưu trữ chỉ cần sửa một chỗ.
- Workflow đọc payload theo khóa, không truyền payload qua QStash. Kết quả mỗi step chỉ là số đếm, nên giữ được nhỏ.
- `since` lấy từ `published_at` mới nhất của post trong source, trừ 1 ngày chồng lấn (upsert tự khử trùng). Source mới thì lấy 30 ngày gần nhất. `limit` mặc định 500, tối đa 2000.
- Comment: sau mỗi batch post, các post mới hoặc có `comment_count` tăng được gom thành run `facebook-comments` (≤ 50 post mỗi run).
- Payload gốc có thông tin cá nhân. Bucket R2 hiện tại là public, nên production cần đặt `R2_RAW_BUCKET_NAME` trỏ tới một bucket private.
- **Lý do:** dùng lại đường webhook đã chạy ổn định và không bị giới hạn kích thước message QStash.
