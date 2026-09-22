import type {
  GetResearchRunResult,
  ListResearchRunsResult,
  RebuildResearchHtmlResult,
  StartResearchBody,
  StartResearchResult,
} from "@/lib/research/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

function getErrorMessage(data: { error?: string; message?: string }): string {
  return data.message ?? data.error ?? "Request failed.";
}

export async function fetchResearchRuns(
  workspaceId: string,
): Promise<ListResearchRunsResult> {
  const res = await workspaceFetch(workspaceId, "/api/research-runs");
  const data = (await res.json()) as ListResearchRunsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}

export async function fetchResearchRun(
  workspaceId: string,
  runId: string,
): Promise<Extract<GetResearchRunResult, { found: true }>> {
  const res = await workspaceFetch(workspaceId, `/api/research-runs/${runId}`);
  const data = (await res.json()) as GetResearchRunResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(getErrorMessage(data));
  }

  if (!data.found) {
    throw new Error("Research run not found.");
  }

  return data;
}

export async function deleteResearchRunRequest(
  workspaceId: string,
  runId: string,
): Promise<void> {
  const res = await workspaceFetch(workspaceId, `/api/research-runs/${runId}`, {
    method: "DELETE",
  });
  const data = (await res.json()) as { error?: string; message?: string };

  if (!res.ok) {
    throw new Error(getErrorMessage(data));
  }
}

export async function rebuildResearchHtmlRequest(
  workspaceId: string,
  runId: string,
): Promise<RebuildResearchHtmlResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/research-runs/${runId}/html`,
    { method: "POST" },
  );
  const data = (await res.json()) as RebuildResearchHtmlResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}

export async function startResearchRunRequest(
  workspaceId: string,
  body: StartResearchBody,
): Promise<StartResearchResult> {
  const res = await workspaceFetch(workspaceId, "/api/research-runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as StartResearchResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}
