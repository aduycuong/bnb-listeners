import type { ApiKeyScope } from "./constants";
import type { WorkspaceKeyBody } from "./schema";

export type WorkspaceApiKeyItem = {
  id: string;
  unkeyKeyId: string;
  name: string;
  keyStart: string;
  scopes: ApiKeyScope[];
  /** Null: every project of the workspace. */
  projectIds: string[] | null;
  /** Display name or email of the member the key runs as; null on keys made before D27. */
  createdByName: string | null;
  createdAt: string;
};

export type CreateWorkspaceKeyParams = {
  workspaceId: string;
  userId: string;
} & WorkspaceKeyBody;

export type CreateWorkspaceKeyResult = {
  key: WorkspaceApiKeyItem;
  /** Full API key — shown once at creation time, never retrievable again. */
  rawKey: string;
};

export type UpdateWorkspaceKeyParams = {
  workspaceId: string;
  keyId: string;
} & WorkspaceKeyBody;

export type ListWorkspaceKeysResult = {
  items: WorkspaceApiKeyItem[];
};

export type DeleteWorkspaceKeyParams = {
  workspaceId: string;
  keyId: string;
};

export type VerifyWorkspaceKeyResult =
  | { valid: true; workspaceId: string; unkeyKeyId: string }
  | { valid: false; workspaceId: null; reason: string };

/** A verified key with what it may do (D27). */
export type AuthorizedWorkspaceKey = {
  keyId: string;
  workspaceId: string;
  /** Member the calls run as: the key's creator, or the workspace owner for older keys. */
  userId: string;
  userEmail: string | null;
  scopes: ApiKeyScope[];
  projectIds: string[] | null;
};
