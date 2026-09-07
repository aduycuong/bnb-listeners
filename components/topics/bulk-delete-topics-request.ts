import type { BulkDeleteTopicsResult } from "@/lib/topics/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export type BulkDeleteTopicsRequestResult = {
  ok: boolean;
  data?: BulkDeleteTopicsResult;
  message?: string;
};

export async function bulkDeleteTopicsRequest(
  workspaceId: string,
  ids: string[],
): Promise<BulkDeleteTopicsRequestResult> {
  const res = await workspaceFetch(workspaceId, "/api/topics/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const data = (await res.json()) as BulkDeleteTopicsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? data.error ?? "Could not delete topics.",
    };
  }

  return {
    ok: true,
    data,
  };
}
