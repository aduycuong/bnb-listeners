import type { MergeTopicsResult } from "@/lib/topics/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export type MergeTopicsRequestBody =
  | {
      sourceIds: string[];
      targetId: string;
    }
  | {
      sourceIds: string[];
      newTopic: {
        name: string;
        description?: string;
      };
    };

export type MergeTopicsRequestResult = {
  ok: boolean;
  data?: MergeTopicsResult;
  message?: string;
};

export async function mergeTopicsRequest(
  workspaceId: string,
  body: MergeTopicsRequestBody,
): Promise<MergeTopicsRequestResult> {
  const res = await workspaceFetch(workspaceId, "/api/topics/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as MergeTopicsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? data.error ?? "Could not merge topics.",
    };
  }

  return {
    ok: true,
    data,
  };
}
