export const X_WORKSPACE_ID_HEADER = "x-workspace-id";

export const WORKSPACE_PERMISSIONS = ["read", "edit", "owner"] as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[number];

export const WORKSPACE_PERMISSION_CACHE_TTL_MS = 60 * 1000;

export const DEFAULT_WORKSPACE_NAME = "My workspace";

export const DEFAULT_WORKSPACE_INDEX = 0;

export const WORKSPACE_INDEX_STORAGE_KEY = "workspace-index";

export const DEFAULT_TOPIC_SCOPE = "tin tức và dữ liệu về bất động sản";

export const TOPIC_LANGUAGES = ["vietnamese", "english", "auto"] as const;

export type TopicLanguage = (typeof TOPIC_LANGUAGES)[number];

export const DEFAULT_TOPIC_LANGUAGE: TopicLanguage = "auto";

export const TOPIC_LANGUAGE_OPTIONS: {
  value: TopicLanguage;
  label: string;
  description: string;
}[] = [
  {
    value: "vietnamese",
    label: "Vietnamese",
    description: "Always generate topic names and descriptions in Vietnamese.",
  },
  {
    value: "english",
    label: "English",
    description: "Always generate topic names and descriptions in English.",
  },
  {
    value: "auto",
    label: "Auto",
    description: "Match the language of the document being classified.",
  },
];
