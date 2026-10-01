import type { BulkDeleteTermsResult } from "@/lib/terms/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type BulkDeleteTermsRequestResult = {
  ok: boolean;
  data?: BulkDeleteTermsResult;
  message?: string;
};

export async function bulkDeleteTermsRequest(
  workspaceId: string,
  projectId: string,
  ids: string[],
): Promise<BulkDeleteTermsRequestResult> {
  const res = await projectFetch(workspaceId, projectId, "/api/terms/bulk-delete", {
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
