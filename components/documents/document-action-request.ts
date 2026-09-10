import type { ClassifyDocumentResult } from "@/lib/classification/types";
import type { RebuildDocumentChunksResult } from "@/lib/chunking/types";
import type {
  RefreshDocumentFromSourceResult,
  UpdateDocumentCommentsResult,
} from "@/lib/documents/types";
import type { ScoreDocumentResult } from "@/lib/scoring/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

async function parseJson<T>(res: Response): Promise<T & { error?: string; message?: string }> {
  return (await res.json()) as T & { error?: string; message?: string };
}

function getErrorMessage(data: { error?: string; message?: string }, fallback: string) {
  return data.message ?? data.error ?? fallback;
}

export async function refreshDocumentFromSourceRequest(
  workspaceId: string,
  documentId: string,
): Promise<RefreshDocumentFromSourceResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/refresh-from-source`,
    { method: "POST" },
  );
  const data = await parseJson<RefreshDocumentFromSourceResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not refresh document from source."));
  }

  return data;
}

export async function scoreDocumentRequest(
  workspaceId: string,
  documentId: string,
): Promise<ScoreDocumentResult> {
  const res = await workspaceFetch(workspaceId, `/api/documents/${documentId}/score`, {
    method: "POST",
  });
  const data = await parseJson<ScoreDocumentResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not re-score document."));
  }

  return data;
}

export async function classifyDocumentRequest(
  workspaceId: string,
  documentId: string,
): Promise<ClassifyDocumentResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/classify`,
    { method: "POST" },
  );
  const data = await parseJson<ClassifyDocumentResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not re-classify document."));
  }

  return data;
}

export async function updateDocumentCommentsRequest(
  workspaceId: string,
  documentId: string,
): Promise<UpdateDocumentCommentsResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/documents/${documentId}/update-comments`,
    { method: "POST" },
  );
  const data = await parseJson<UpdateDocumentCommentsResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not update comments."));
  }

  return data;
}

export async function rebuildDocumentChunksRequest(
  workspaceId: string,
  documentId: string,
): Promise<RebuildDocumentChunksResult> {
  const res = await workspaceFetch(workspaceId, `/api/documents/${documentId}/chunks`, {
    method: "POST",
  });
  const data = await parseJson<RebuildDocumentChunksResult>(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not rebuild search index."));
  }

  return data;
}
