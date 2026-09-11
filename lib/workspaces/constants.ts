export const X_WORKSPACE_ID_HEADER = "x-workspace-id";

export const WORKSPACE_PERMISSIONS = ["read", "edit", "owner"] as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[number];

export const WORKSPACE_PERMISSION_CACHE_TTL_MS = 60 * 1000;

export const DEFAULT_WORKSPACE_NAME = "My workspace";

export const DEFAULT_WORKSPACE_INDEX = 0;

export const WORKSPACE_INDEX_STORAGE_KEY = "workspace-index";

export const DEFAULT_DATA_COLLECTION_SCOPE =
  "tin tức và dữ liệu về bất động sản";

export const MAX_DATA_COLLECTION_SCOPE_LENGTH = 500;
export const MAX_TERM_CRITERIA_LENGTH = 2_000;

export const TERM_LANGUAGES = ["vietnamese", "english", "auto"] as const;

export type TermLanguage = (typeof TERM_LANGUAGES)[number];

export const DEFAULT_TERM_LANGUAGE: TermLanguage = "auto";

export const TERM_LANGUAGE_OPTIONS: {
  value: TermLanguage;
  label: string;
  description: string;
}[] = [
  {
    value: "vietnamese",
    label: "Vietnamese",
    description: "Luôn tạo tên và mô tả term bằng tiếng Việt.",
  },
  {
    value: "english",
    label: "English",
    description: "Luôn tạo tên và mô tả term bằng tiếng Anh.",
  },
  {
    value: "auto",
    label: "Auto",
    description: "Tên và mô tả term cùng ngôn ngữ với tài liệu.",
  },
];
