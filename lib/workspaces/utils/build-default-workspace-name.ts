import { DEFAULT_WORKSPACE_NAME } from "../constants";

export function buildDefaultWorkspaceName(displayName: string | null): string {
  const trimmed = displayName?.trim();
  if (!trimmed) {
    return DEFAULT_WORKSPACE_NAME;
  }

  return `${trimmed}'s workspace`;
}
