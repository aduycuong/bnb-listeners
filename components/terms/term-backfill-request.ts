import type { ChatModelId } from "@/lib/langchain";
import type {
  CancelTermBackfillRunResult,
  CreateTermBackfillRunResult,
  EstimateTermBackfillResult,
  GetTermBackfillRunResult,
} from "@/lib/term-backfill/types";
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

export async function estimateTermBackfillRequest(
  workspaceId: string,
  termId: string,
  body: BackfillRequestBody,
): Promise<EstimateTermBackfillResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/terms/${termId}/backfill/estimate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<EstimateTermBackfillResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not estimate backfill."));
  }

  return data;
}

export async function createTermBackfillRunRequest(
  workspaceId: string,
  termId: string,
  body: BackfillRequestBody,
): Promise<CreateTermBackfillRunResult> {
  const res = await workspaceFetch(workspaceId, `/api/terms/${termId}/backfill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson<CreateTermBackfillRunResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not start backfill."));
  }

  return data;
}

export async function getTermBackfillRunRequest(
  workspaceId: string,
  termId: string,
  runId: string,
): Promise<GetTermBackfillRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/terms/${termId}/backfill/${runId}`,
  );
  const data = await parseJson<GetTermBackfillRunResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not load backfill run."));
  }

  return data;
}

export async function cancelTermBackfillRunRequest(
  workspaceId: string,
  termId: string,
  runId: string,
): Promise<CancelTermBackfillRunResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/terms/${termId}/backfill/${runId}/cancel`,
    { method: "POST" },
  );
  const data = await parseJson<CancelTermBackfillRunResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not cancel backfill."));
  }

  return data;
}
