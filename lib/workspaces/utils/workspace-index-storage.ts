import {
  DEFAULT_WORKSPACE_INDEX,
  WORKSPACE_INDEX_STORAGE_KEY,
} from "../constants";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getStoredWorkspaceIndex(): number {
  if (!canUseStorage()) {
    return DEFAULT_WORKSPACE_INDEX;
  }

  const raw = window.localStorage.getItem(WORKSPACE_INDEX_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_WORKSPACE_INDEX;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_WORKSPACE_INDEX;
  }

  return parsed;
}

export function setStoredWorkspaceIndex(index: number): void {
  if (!canUseStorage() || !Number.isInteger(index) || index < 0) {
    return;
  }

  window.localStorage.setItem(WORKSPACE_INDEX_STORAGE_KEY, String(index));
}
