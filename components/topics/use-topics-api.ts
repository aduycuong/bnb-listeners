"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mentionsQueryKey } from "@/components/mentions/use-mentions-api";
import { toast } from "@/components/ui/toast";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import type { ListTopicsResult, TopicSummary } from "@/lib/topics/types";

export type TopicsApiScope = { workspaceId: string; projectId: string };

export const topicsQueryKey = (projectId: string) => ["topics", projectId] as const;

async function fetchJson<T>(scope: TopicsApiScope, url: string, init?: RequestInit): Promise<T> {
  const res = await projectFetch(scope.workspaceId, scope.projectId, url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? "Có lỗi xảy ra.");
  return body;
}

export function useTopicsList(scope: TopicsApiScope, includeHidden = false) {
  return useQuery({
    queryKey: [...topicsQueryKey(scope.projectId), "list", includeHidden],
    queryFn: () =>
      fetchJson<ListTopicsResult>(scope, `/api/topics?includeHidden=${includeHidden ? "1" : "0"}`),
    placeholderData: keepPreviousData,
  });
}

/** Topic changes also refresh the Mentions list, which shows each mention's topic. */
function useTopicMutation<TBody>(
  scope: TopicsApiScope,
  request: (body: TBody) => Promise<TopicSummary>,
  successTitle: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: async () => {
      toast.add({ title: successTitle, type: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: topicsQueryKey(scope.projectId) }),
        queryClient.invalidateQueries({ queryKey: mentionsQueryKey(scope.projectId) }),
      ]);
    },
    onError: (error) => toast.add({ title: error.message, type: "error" }),
  });
}

export function useUpdateTopic(scope: TopicsApiScope) {
  return useTopicMutation(
    scope,
    ({ id, ...body }: { id: string; name?: string; description?: string; status?: "active" | "hidden" }) =>
      fetchJson<TopicSummary>(scope, `/api/topics/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    "Đã lưu topic.",
  );
}

export function useMergeTopic(scope: TopicsApiScope) {
  return useTopicMutation(
    scope,
    ({ id, intoId }: { id: string; intoId: string }) =>
      fetchJson<TopicSummary>(scope, `/api/topics/${id}/merge`, {
        method: "POST",
        body: JSON.stringify({ intoId }),
      }),
    "Đã gộp topic.",
  );
}
