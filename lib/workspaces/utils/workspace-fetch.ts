import { X_WORKSPACE_ID_HEADER } from "../constants";

export function workspaceFetch(
  workspaceId: string,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  headers.set(X_WORKSPACE_ID_HEADER, workspaceId);

  return fetch(input, {
    ...init,
    headers,
  });
}
