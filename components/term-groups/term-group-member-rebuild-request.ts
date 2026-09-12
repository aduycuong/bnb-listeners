import type { ChatModelId } from "@/lib/langchain";
import type {
  CancelTermGroupMemberRebuildRunResult,
  CreateTermGroupMemberRebuildRunResult,
  EstimateTermGroupMemberRebuildResult,
  GetTermGroupMemberRebuildRunResult,
} from "@/lib/term-group-member-rebuild/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type MemberRebuildRequestBody = {
  model?: ChatModelId;
  includeAlreadyMembers?: boolean;
  removeNonMatching?: boolean;
  enableWebResearch?: boolean;
  confidenceMin?: number;
};

async function parseJson<T>(
  res: Response,
): Promise<T & { error?: string; message?: string }> {
  return (await res.json()) as T & { error?: string; message?: string };
}

function getErrorMessage(
  data: { error?: string; message?: string },
  fallback: string,
) {
  return data.message ?? data.error ?? fallback;
}

export async function estimateTermGroupMemberRebuildRequest(
  workspaceId: string,
  groupId: string,
  body: MemberRebuildRequestBody,
): Promise<EstimateTermGroupMemberRebuildResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/member-rebuild/estimate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<EstimateTermGroupMemberRebuildResult>(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Could not estimate member rebuild."),
    );
  }

  return data;
}

export async function createTermGroupMemberRebuildRunRequest(
  workspaceId: string,
  groupId: string,
  body: MemberRebuildRequestBody,
): Promise<CreateTermGroupMemberRebuildRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/member-rebuild`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<CreateTermGroupMemberRebuildRunResult>(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Could not start member rebuild."),
    );
  }

  return data;
}

export async function getTermGroupMemberRebuildRunRequest(
  workspaceId: string,
  groupId: string,
  runId: string,
): Promise<GetTermGroupMemberRebuildRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/member-rebuild/${runId}`,
  );
  const data = await parseJson<GetTermGroupMemberRebuildRunResult>(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Could not load member rebuild run."),
    );
  }

  return data;
}

export async function cancelTermGroupMemberRebuildRunRequest(
  workspaceId: string,
  groupId: string,
  runId: string,
): Promise<CancelTermGroupMemberRebuildRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/term-groups/${groupId}/member-rebuild/${runId}/cancel`,
    { method: "POST" },
  );
  const data = await parseJson<CancelTermGroupMemberRebuildRunResult>(res);

  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Could not cancel member rebuild."),
    );
  }

  return data;
}
