import type { ChatModelId } from "@/lib/langchain";
import type {
  CancelTopicBackfillRunResult,
  CreateTopicBackfillRunResult,
  EstimateTopicBackfillResult,
  GetTopicBackfillRunResult,
} from "@/lib/topic-backfill/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type BackfillRequestBody = {
  newListeningStartedAt: string;
  model?: ChatModelId;
  qualityMin?: number;
  includeAlreadyAssigned?: boolean;
};

async function parseJson<T>(res: Response): Promise<T & { error?: string; message?: string }> {
  return (await res.json()) as T & { error?: string; message?: string };
}

function getErrorMessage(data: { error?: string; message?: string }, fallback: string) {
  return data.message ?? data.error ?? fallback;
}

export async function estimateTopicBackfillRequest(
  workspaceId: string,
  topicId: string,
  body: BackfillRequestBody,
): Promise<EstimateTopicBackfillResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/topics/${topicId}/backfill/estimate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<EstimateTopicBackfillResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not estimate backfill."));
  }

  return data;
}

export async function createTopicBackfillRunRequest(
  workspaceId: string,
  topicId: string,
  body: BackfillRequestBody,
): Promise<CreateTopicBackfillRunResult> {
  const res = await workspaceFetch(workspaceId, `/api/topics/${topicId}/backfill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson<CreateTopicBackfillRunResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not start backfill."));
  }

  return data;
}

export async function getTopicBackfillRunRequest(
  workspaceId: string,
  topicId: string,
  runId: string,
): Promise<GetTopicBackfillRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/topics/${topicId}/backfill/${runId}`,
  );
  const data = await parseJson<GetTopicBackfillRunResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not load backfill run."));
  }

  return data;
}

export async function cancelTopicBackfillRunRequest(
  workspaceId: string,
  topicId: string,
  runId: string,
): Promise<CancelTopicBackfillRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/topics/${topicId}/backfill/${runId}/cancel`,
    { method: "POST" },
  );
  const data = await parseJson<CancelTopicBackfillRunResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not cancel backfill."));
  }

  return data;
}
