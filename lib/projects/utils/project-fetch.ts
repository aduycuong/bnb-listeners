import { X_PROJECT_ID_HEADER } from "@/lib/projects/constants";
import { X_WORKSPACE_ID_HEADER } from "@/lib/workspaces/constants";

export function projectFetch(
  workspaceId: string,
  projectId: string,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  headers.set(X_WORKSPACE_ID_HEADER, workspaceId);
  headers.set(X_PROJECT_ID_HEADER, projectId);

  return fetch(input, {
    ...init,
    headers,
  });
}
