---
name: development-process-sync
description: >-
  Sync development progress to the Project Timeline report server by comparing
  existing updates with git history, synthesizing code changes into report
  records, and posting via API only after user confirmation. Use when the user
  asks to update the development process, sync timeline, post progress reports,
  or publish dev updates to timeline.ryobui.com.
---

# Development Process Sync

Đăng cập nhật tiến độ phát triển lên server [Project Timeline](https://timeline.ryobui.com) bằng cách tổng hợp thay đổi code từ git — không phải copy raw commit messages.

> **Master Timeline (ngang):** Dùng skill `master-timeline-sync` để sync cột mốc lớn từ `timeline-sync.json`. Skill này chỉ xử lý timeline dọc (cập nhật hàng ngày).

## Cấu hình

Đọc `timeline-sync.json` ở root repo (gitignored).

| Field | Ý nghĩa |
|-------|---------|
| `apiBaseUrl` | Host của Timeline API |
| `apiKey` | Bearer token để ghi (bắt buộc) |
| `entries[].workspaceKey` | Tên thư mục workspace (e.g. `bnb-listeners`) |
| `entries[].projectSlug` | Slug project được phép sync trong workspace này |
| `entries[].gitBranch` | Branch để đọc lịch sử (mặc định `main`) |
| `entries[].latestSyncCommit` | SHA của commit cuối đã sync, `null` nếu chưa sync |
| `entries[].masterTimeline` | Master Timeline local — xem skill `master-timeline-sync` |

**Quy tắc slug:** Chỉ được đọc/ghi timeline cho đúng `projectSlug` trong config. Không dùng slug nào khác dù user yêu cầu — bảo user sửa `timeline-sync.json` trước.

## Workflow

### 1. Đọc config

1. Đọc `timeline-sync.json`, tìm entry có `workspaceKey` khớp tên thư mục workspace.
2. Ghi nhớ `projectSlug`, `apiBaseUrl`, `apiKey`, `gitBranch`, `latestSyncCommit`.
3. Nếu `apiKey` trống → dừng, yêu cầu user điền vào `timeline-sync.json`.
4. Nếu không có entry khớp → dừng, yêu cầu user thêm vào `timeline-sync.json`.

### 2. Xác định khoảng cần sync

Lấy commits sau `latestSyncCommit` (hoặc 30 ngày gần nhất nếu `null`):

```bash
# Khi latestSyncCommit có giá trị:
git log {branch} {latestSyncCommit}..HEAD --format="%H|%ad|%s" --date=short --reverse

# Khi latestSyncCommit là null (lần đầu sync):
git log {branch} --since="30 days ago" --format="%H|%ad|%s" --date=short --reverse
```

Đồng thời, fetch những ngày đã có trên timeline để tránh trùng:

```bash
curl -sS "{apiBaseUrl}/api/v1/updates?project={projectSlug}&page=1&pageSize=100"
```

Báo cáo cho user: commit checkpoint local, checkpoint trên server, các ngày có commit chưa được đăng.

### 3. Xác nhận với user

Hỏi user khoảng ngày nào cần sync. Không tự quyết — chờ user xác nhận.

### 4. Phân tích code changes

Với từng ngày trong khoảng đã xác nhận, xem diff của các commit:

```bash
git log {branch} --after="{YYYY-MM-DD}" --before="{YYYY-MM-DD}" --format="%H|%ad|%s" --date=short --reverse
git show --stat {hash}
git show {hash} --no-color
```

Đọc file thay đổi khi cần để hiểu hành vi thực sự — commit message chỉ là gợi ý.

### 5. Soạn bản nháp

Mặc định **một record mỗi ngày** (gộp toàn bộ thay đổi trong ngày vào một bài).

| Field | Hướng dẫn |
|-------|-----------|
| `title` | Tiêu đề ngắn gọn ≤ 120 ký tự |
| `summary` | 1–3 câu mô tả thay đổi và tác động, ≤ 2000 ký tự |
| `publishedAt` | Ngày của record (`YYYY-MM-DD`) |

- Viết bằng **tiếng Việt**, tone hướng đến user/operator.
- Tổng hợp từ diff, không copy commit message.
- Bỏ qua ngày đã có trên timeline (trừ khi user yêu cầu PATCH).

### 6. Trình bày bản nháp — chờ xác nhận

**Không POST nếu chưa được user duyệt.**

Trình bày từng record:

| Ngày | Title | Summary (preview) | Commits | Action |
|------|-------|-------------------|---------|--------|
| … | … | 120 ký tự đầu… | N commits | POST / skip |

Hỏi user xác nhận, sửa, hoặc bỏ qua từng record.

### 7. POST lên timeline

**Kiểm tra trước:** `projectSlug` trong body phải khớp đúng config — nếu khác, dừng ngay.

```bash
curl -sS -X POST "{apiBaseUrl}/api/v1/updates" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Idempotency-Key: {projectSlug}-{publishedAt}-sync" \
  -H "Content-Type: application/json" \
  --data '{
    "projectSlug": "{projectSlug}",
    "title": "...",
    "summary": "...",
    "publishedAt": "YYYY-MM-DD"
  }'
```

- `201` → tạo mới thành công.
- `200` + `Idempotent-Replayed: true` → retry an toàn (không ghi trùng).
- `409 IDEMPOTENCY_CONFLICT` → cùng key nhưng body khác → dừng record đó, hỏi user.
- `401` / `405` → `apiKey` sai hoặc thiếu / writes bị tắt trên deployment.

### 8. Xác nhận readback

Fetch lại `GET /api/v1/updates?project={projectSlug}` và kiểm tra từng `publishedAt` vừa đăng có xuất hiện với đúng title.

### 9. Cập nhật `latestSyncCommit`

Sau khi Step 8 thành công:

1. Lấy SHA của commit mới nhất trong khoảng vừa sync (`git log {branch} --format="%H" -1` hoặc commit cuối trong danh sách đã xử lý).
2. Set `latestSyncCommit` bằng SHA đó (chỉ tiến lên, không lùi).
3. Ghi lại `timeline-sync.json` — giữ nguyên các field khác.

Nếu tất cả records bị skip hoặc POST thất bại → không cập nhật `latestSyncCommit`.

## API reference

### Đọc updates

```bash
curl -sS "{apiBaseUrl}/api/v1/updates?project={projectSlug}&page=1&pageSize=100"
```

Response:

```json
{
  "data": [
    {
      "id": "upd_example",
      "projectId": "prj_social_listening",
      "title": "Bản cập nhật social listening",
      "summary": "Hoàn thành tính năng theo dõi mới...",
      "publishedAt": "2026-09-14",
      "createdAt": "2026-09-14T02:15:00.000Z",
      "updatedAt": "2026-09-14T02:15:00.000Z",
      "project": { "id": "prj_social_listening", "slug": "social-listening", "name": "Social listening" }
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

### Đăng bài mới (POST)

```bash
curl -sS -X POST "{apiBaseUrl}/api/v1/updates" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Idempotency-Key: {projectSlug}-{publishedAt}-sync" \
  -H "Content-Type: application/json" \
  --data '{
    "projectSlug": "{projectSlug}",
    "title": "Tiêu đề",
    "summary": "Mô tả thay đổi.",
    "publishedAt": "2026-09-14"
  }'
```

- Lần đầu: `201 Created`, `Idempotent-Replayed: false`.
- Retry cùng key + cùng body: `200 OK`, `Idempotent-Replayed: true`.
- Cùng key + body khác: `409 IDEMPOTENCY_CONFLICT`, không ghi gì.

### Sửa bài (PATCH) — chỉ khi user yêu cầu rõ

```bash
curl -sS -X PATCH "{apiBaseUrl}/api/v1/updates/{id}" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Content-Type: application/json" \
  --data '{"summary": "Nội dung mới"}'
```

### Xóa bài (DELETE) — chỉ khi user yêu cầu rõ

```bash
curl -i -X DELETE "{apiBaseUrl}/api/v1/updates/{id}" \
  -H "Authorization: Bearer {apiKey}"
```

`DELETE` là idempotent: xóa lại cùng ID vẫn trả `204`.

### Lỗi

Mọi lỗi trả về cùng dạng:

```json
{ "error": { "code": "...", "message": "...", "details": "..." } }
```
