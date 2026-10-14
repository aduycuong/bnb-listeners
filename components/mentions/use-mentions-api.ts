"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";
import type { ListMentionsQuery } from "@/lib/mentions/schema";
import type {
  EnrichEvaluation,
  GetMentionThreadResult,
  LabelSampleSummary,
  LabelSampleTask,
  ListLabelSamplesResult,
  ListMentionsResult,
  MatchEvaluation,
  SetItemLabelResult,
} from "@/lib/mentions/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

export type MentionsApiScope = { workspaceId: string; projectId: string };

/** Every mentions query of a project starts with this key, so a label change refreshes all. */
export const mentionsQueryKey = (projectId: string) => ["mentions", projectId] as const;

async function fetchJson<T>(scope: MentionsApiScope, url: string, init?: RequestInit): Promise<T> {
  const res = await projectFetch(scope.workspaceId, scope.projectId, url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json()) as T & { message?: string; error?: string };
  if (!res.ok) throw new Error(body.message ?? body.error ?? "Có lỗi xảy ra.");
  return body;
}

function toSearch(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export function useMentionsList(scope: MentionsApiScope, filters: ListMentionsQuery) {
  return useQuery({
    queryKey: [...mentionsQueryKey(scope.projectId), "list", filters],
    queryFn: () =>
      fetchJson<ListMentionsResult>(scope, `/api/mentions?${toSearch(filters as Record<string, string>)}`),
    placeholderData: keepPreviousData,
  });
}

export function useMentionThread(scope: MentionsApiScope, rootId: string | null) {
  return useQuery({
    queryKey: [...mentionsQueryKey(scope.projectId), "thread", rootId],
    queryFn: () =>
      fetchJson<GetMentionThreadResult>(scope, `/api/mentions/thread?rootId=${rootId}`),
    enabled: Boolean(rootId),
  });
}

export function useSetItemLabel(scope: MentionsApiScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      contentItemId: string;
      isRelevant: boolean | null;
      sentiment?: "positive" | "neutral" | "negative" | null;
      aspectKeys?: string[] | null;
      sampleId?: string;
    }) =>
      fetchJson<SetItemLabelResult>(scope, "/api/mentions/labels", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mentionsQueryKey(scope.projectId) });
    },
    onError: (error) => toast.add({ title: error.message, type: "error" }),
  });
}

export function useLabelSamples(scope: MentionsApiScope) {
  return useQuery({
    queryKey: [...mentionsQueryKey(scope.projectId), "samples"],
    queryFn: () => fetchJson<ListLabelSamplesResult>(scope, "/api/mentions/samples"),
  });
}

export function useCreateLabelSample(scope: MentionsApiScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: "match" | "enrich"; mentions: number; unmatched: number }) =>
      fetchJson<LabelSampleSummary>(scope, "/api/mentions/samples", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mentionsQueryKey(scope.projectId) });
    },
    onError: (error) => toast.add({ title: error.message, type: "error" }),
  });
}

export function useLabelSampleTask(
  scope: MentionsApiScope,
  sampleId: string | null,
  position: number,
  nextUnlabeled: boolean,
) {
  return useQuery({
    queryKey: [...mentionsQueryKey(scope.projectId), "task", sampleId, position, nextUnlabeled],
    queryFn: () =>
      fetchJson<LabelSampleTask>(
        scope,
        `/api/mentions/samples/${sampleId}/task?${toSearch({ position, next: nextUnlabeled ? "1" : "0" })}`,
      ),
    enabled: Boolean(sampleId),
  });
}

export function useMatchEvaluation(scope: MentionsApiScope, sampleId?: string) {
  return useQuery({
    queryKey: [...mentionsQueryKey(scope.projectId), "evaluation", sampleId ?? "latest"],
    queryFn: () =>
      fetchJson<MatchEvaluation>(
        scope,
        `/api/mentions/evaluation${sampleId ? `?sampleId=${sampleId}` : ""}`,
      ),
    retry: false,
  });
}

export function useEnrichEvaluation(scope: MentionsApiScope, sampleId?: string) {
  return useQuery({
    queryKey: [...mentionsQueryKey(scope.projectId), "enrich-evaluation", sampleId ?? "latest"],
    queryFn: () =>
      fetchJson<EnrichEvaluation>(
        scope,
        `/api/mentions/enrich-evaluation${sampleId ? `?sampleId=${sampleId}` : ""}`,
      ),
    retry: false,
  });
}
