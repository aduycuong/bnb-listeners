import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type DeleteTopicRequestResult = {
  ok: boolean;
  message?: string;
};

export async function deleteTermRequest(
  workspaceId: string,
  projectId: string,
  termId: string,
): Promise<DeleteTopicRequestResult> {
  const res = await projectFetch(workspaceId, projectId, `/api/terms/${termId}`, {
    method: "DELETE",
  });
  const data = (await res.json()) as { message?: string; error?: string };

  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? data.error ?? "Could not delete term.",
    };
  }

  return {
    ok: true,
    message: data.message ?? "Term deleted.",
  };
}
