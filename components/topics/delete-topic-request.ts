import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export type DeleteTopicRequestResult = {
  ok: boolean;
  message?: string;
};

export async function deleteTopicRequest(
  workspaceId: string,
  topicId: string,
): Promise<DeleteTopicRequestResult> {
  const res = await workspaceFetch(workspaceId, `/api/topics/${topicId}`, {
    method: "DELETE",
  });
  const data = (await res.json()) as { message?: string; error?: string };

  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? data.error ?? "Could not delete topic.",
    };
  }

  return {
    ok: true,
    message: data.message ?? "Topic deleted.",
  };
}
