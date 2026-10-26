/** What a workspace API key may do (docs/decisions.md D27). */
export const API_KEY_SCOPES = ["reports:read", "mentions:read", "projects:write"] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_SCOPE_LABELS: Record<ApiKeyScope, { label: string; description: string }> = {
  "reports:read": {
    label: "Đọc số liệu",
    description: "Tổng quan, cảm xúc, kênh, tác giả, chủ đề, số liệu riêng theo case.",
  },
  "mentions:read": {
    label: "Đọc đề cập",
    description: "Tìm và đọc nội dung từng đề cập, kèm link bài gốc.",
  },
  "projects:write": {
    label: "Tạo project",
    description: "Tạo project mới trong workspace; key phải dùng được cho mọi project.",
  },
};

/** Scopes of a key made for a project from its "Kết nối AI" page. */
export const PROJECT_KEY_SCOPES: ApiKeyScope[] = ["reports:read", "mentions:read"];
