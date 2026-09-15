---
name: master-timeline-sync
description: >-
  Replace the remote Master Timeline on timeline.ryobui.com with the local
  masterTimeline in timeline-sync.json. Use when the user asks to sync master
  timeline, update horizontal timeline milestones, or publish master timeline
  to the timeline server.
---

# Master Timeline Sync

Thay thế toàn bộ Master Timeline trên server [Project Timeline](https://timeline.ryobui.com) bằng bản local trong `timeline-sync.json`.

Master Timeline là dòng thời gian ngang (cột mốc lớn), tách biệt với timeline dọc (cập nhật hàng ngày — xem skill `development-process-sync`).

## Cấu hình

Đọc `timeline-sync.json` ở root repo (gitignored).

| Field | Ý nghĩa |
|-------|---------|
| `apiBaseUrl` | Host của Timeline API |
| `apiKey` | Bearer token để ghi (bắt buộc) |
| `entries[].workspaceKey` | Tên thư mục workspace (e.g. `bnb-listeners`) |
| `entries[].projectSlug` | Slug project được phép sync |
| `entries[].masterTimeline.milestones[]` | Danh sách cột mốc local |

Mỗi milestone local:

| Field | Bắt buộc | Ý nghĩa |
|-------|----------|---------|
| `id` | Có | ID ổn định để diff và idempotency key (e.g. `mst_social_listening_20260901_production`) |
| `date` | Có | Ngày cột mốc `YYYY-MM-DD` |
| `title` | Có | Tiêu đề ngắn gọn, viết bằng **tiếng Việt** |

**Quy tắc slug:** Chỉ được đọc/ghi Master Timeline cho đúng `projectSlug` trong config. Không dùng slug nào khác dù user yêu cầu — bảo user sửa `timeline-sync.json` trước.

## Workflow

### 1. Đọc config

1. Đọc `timeline-sync.json`, tìm entry có `workspaceKey` khớp tên thư mục workspace.
2. Ghi nhớ `projectSlug`, `apiBaseUrl`, `apiKey`, `masterTimeline.milestones`.
3. Nếu `apiKey` trống → dừng, yêu cầu user điền vào `timeline-sync.json`.
4. Nếu không có entry khớp → dừng, yêu cầu user thêm vào `timeline-sync.json`.
5. Nếu `masterTimeline` hoặc `milestones` thiếu → dừng, yêu cầu user bổ sung.

Validate local milestones:
- Mỗi item phải có `id`, `date`, `title` (string không rỗng).
- `date` phải đúng định dạng `YYYY-MM-DD`.
- `id` phải unique trong danh sách.
- Sắp xếp theo `date` tăng dần khi trình bày.

### 2. Đọc Master Timeline remote

```bash
curl -sS "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}"
```

Response:

```json
{
  "data": {
    "projectSlug": "social-listening",
    "milestones": [
      { "id": "mst_...", "date": "2026-09-01", "title": "..." }
    ]
  }
}
```

### 3. So sánh và trình bày diff

So sánh remote vs local (theo `date` + `title`, không so `id` vì API tạo ID mới khi POST):

| Action | Điều kiện |
|--------|-----------|
| **Giữ nguyên** | Remote có milestone cùng `date` và `title` |
| **Thêm** | Local có milestone không khớp remote |
| **Xóa** | Remote có milestone không khớp local |
| **Thay đổi** | Cùng `date` nhưng `title` khác |

Trình bày bảng diff cho user. **Không ghi nếu chưa được user xác nhận.**

### 4. Thay thế remote (replace)

API không có endpoint PUT bulk. Thực hiện replace theo thứ tự:

**Bước A — Xóa toàn bộ milestone remote:**

```bash
curl -i -X DELETE \
  "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}/milestones/{milestoneId}" \
  -H "Authorization: Bearer {apiKey}"
```

Lặp cho từng milestone trong response remote. `DELETE` idempotent — xóa lại cùng ID vẫn trả `204`.

**Bước B — Tạo lại từ local:**

```bash
curl -sS -X POST \
  "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}/milestones" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Idempotency-Key: {milestone.id}" \
  -H "Content-Type: application/json" \
  --data '{
    "date": "YYYY-MM-DD",
    "title": "Tiêu đề cột mốc"
  }'
```

- Dùng `milestone.id` từ config làm `Idempotency-Key` (8–200 ký tự).
- POST theo thứ tự `date` tăng dần.
- `201` → tạo mới; `200` + `Idempotent-Replayed: true` → retry an toàn.
- `409 IDEMPOTENCY_CONFLICT` → cùng key nhưng body khác → dừng, hỏi user.

**Lưu ý:** ID server (`mst_<uuid>`) sẽ khác `id` local sau mỗi lần replace. Điều này bình thường — `id` local chỉ dùng cho idempotency và diff, không phải ID server.

### 5. Xác nhận readback

Fetch lại:

```bash
curl -sS "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}"
```

Kiểm tra:
- Số milestone remote = số milestone local.
- Mỗi cặp `date` + `title` khớp (theo thứ tự ngày).

Báo cáo kết quả cho user.

### 6. Không cập nhật `latestSyncCommit`

Master Timeline sync **không** thay đổi `latestSyncCommit` — field đó chỉ dùng cho skill `development-process-sync`.

## Soạn Master Timeline mới

Khi user yêu cầu xây dựng hoặc cập nhật Master Timeline trong `timeline-sync.json`:

1. Đọc git history, docs, và timeline dọc hiện có để hiểu các giai đoạn lớn.
2. Viết milestone **cấp chiến lược** (giai đoạn/tháng), không phải cập nhật hàng ngày.
3. Tiêu đề ngắn gọn, tiếng Việt, hướng đến operator/stakeholder.
4. Gán `id` ổn định: `mst_{projectSlug}_{YYYYMMDD}_{slug}` (slug kebab-case từ title).
5. Ghi vào `entries[].masterTimeline.milestones` trong `timeline-sync.json`.
6. Trình bày cho user duyệt trước khi sync lên server.

## API reference

### Đọc Master Timeline

```bash
curl -sS "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}"
```

### Tạo cột mốc (POST)

```bash
curl -sS -X POST \
  "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}/milestones" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Idempotency-Key: {stable-id}" \
  -H "Content-Type: application/json" \
  --data '{"date": "2026-09-01", "title": "Tiêu đề"}'
```

### Sửa cột mốc (PATCH) — chỉ khi user yêu cầu sửa lẻ, không dùng trong replace

```bash
curl -sS -X PATCH \
  "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}/milestones/{milestoneId}" \
  -H "Authorization: Bearer {apiKey}" \
  -H "Content-Type: application/json" \
  --data '{"title": "Tiêu đề mới"}'
```

### Xóa cột mốc (DELETE)

```bash
curl -i -X DELETE \
  "{apiBaseUrl}/api/v1/master-timelines/{projectSlug}/milestones/{milestoneId}" \
  -H "Authorization: Bearer {apiKey}"
```

### Lỗi

```json
{ "error": { "code": "...", "message": "...", "details": "..." } }
```

| Code | Ý nghĩa |
|------|---------|
| `401` | `apiKey` sai hoặc thiếu |
| `405 WRITES_DISABLED` | Writes bị tắt trên deployment |
| `404 PROJECT_NOT_FOUND` | Slug không tồn tại |
| `409 IDEMPOTENCY_CONFLICT` | Cùng key, body khác |
| `422 VALIDATION_ERROR` | `date` hoặc `title` không hợp lệ |
