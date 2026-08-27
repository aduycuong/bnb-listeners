export type WorkspaceApiKeyItem = {
  id: string;
  unkeyKeyId: string;
  name: string;
  keyStart: string;
  createdAt: string;
};

export type CreateWorkspaceKeyParams = {
  workspaceId: string;
  name: string;
};

export type CreateWorkspaceKeyResult = {
  key: WorkspaceApiKeyItem;
  /** Full API key — shown once at creation time, never retrievable again. */
  rawKey: string;
};

export type ListWorkspaceKeysResult = {
  items: WorkspaceApiKeyItem[];
};

export type DeleteWorkspaceKeyParams = {
  workspaceId: string;
  keyId: string;
};

export type VerifyWorkspaceKeyResult =
  | { valid: true; workspaceId: string }
  | { valid: false; workspaceId: null; reason: string };
