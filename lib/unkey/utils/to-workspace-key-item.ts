import type { WorkspaceApiKey } from "@/db/schema";

import { API_KEY_SCOPES, type ApiKeyScope } from "../constants";
import type { WorkspaceApiKeyItem } from "../types";

export function toWorkspaceKeyScopes(scopes: string[]): ApiKeyScope[] {
  return API_KEY_SCOPES.filter((scope) => scopes.includes(scope));
}

export function toWorkspaceKeyItem(
  row: WorkspaceApiKey,
  createdByName: string | null,
): WorkspaceApiKeyItem {
  return {
    id: row.id,
    unkeyKeyId: row.unkeyKeyId,
    name: row.name,
    keyStart: row.keyStart,
    scopes: toWorkspaceKeyScopes(row.scopes),
    projectIds: row.projectIds,
    createdByName,
    createdAt: row.createdAt.toISOString(),
  };
}
