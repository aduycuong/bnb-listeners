import type { BulkDeleteTermsResult } from "@/lib/terms/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export type BulkDeleteTermsRequestResult = {
  ok: boolean;
  data?: BulkDeleteTermsResult;
  message?: string;
};

export async function bulkDeleteTermsRequest(
  workspaceId: string,
  ids: string[],
): Promise<BulkDeleteTermsRequestResult> {
  const res = await workspaceFetch(workspaceId, "/api/terms/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const data = (await res.json()) as BulkDeleteTermsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? data.error ?? "Could not delete terms.",
    };
  }

  return {
    ok: true,
    data,
  };
}
