import type { MergeTermsResult } from "@/lib/terms/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export type MergeTermsRequestBody =
  | {
      sourceIds: string[];
      targetId: string;
    }
  | {
      sourceIds: string[];
      newTerm: {
        name: string;
        description?: string;
      };
    };

export type MergeTermsRequestResult = {
  ok: boolean;
  data?: MergeTermsResult;
  message?: string;
};

export async function mergeTermsRequest(
  workspaceId: string,
  body: MergeTermsRequestBody,
): Promise<MergeTermsRequestResult> {
  const res = await workspaceFetch(workspaceId, "/api/terms/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as MergeTermsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? data.error ?? "Could not merge terms.",
    };
  }

  return {
    ok: true,
    data,
  };
}
