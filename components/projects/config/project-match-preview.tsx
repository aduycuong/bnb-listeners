"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import type { PreviewMatchesResult } from "@/lib/matching/types";
import type {
  CreateProjectWithConfigBody,
  CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type ProjectForm = UseFormReturn<
  CreateProjectWithConfigInput,
  unknown,
  CreateProjectWithConfigBody
>;

const DEBOUNCE_MS = 600;

function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

/** Tier 1 counts for the entities in the form, over recent items of the chosen sources. */
export function ProjectMatchPreview({
  form,
  workspaceId,
}: {
  form: ProjectForm;
  workspaceId: string;
}) {
  const entities = useWatch({ control: form.control, name: "entities" }) ?? [];
  const sourceIds = useWatch({ control: form.control, name: "sourceIds" }) ?? [];
  const body = JSON.stringify({
    sourceIds,
    entities: entities.map((entity) => ({
      id: entity.id,
      name: entity.name?.trim() ?? "",
      aliases: entity.aliases ?? [],
      ambiguousAliases: entity.ambiguousAliases ?? [],
      withTerms: entity.withTerms ?? [],
      exclude: entity.exclude ?? [],
    })),
  });
  const [debounced, setDebounced] = useState(body);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(body), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [body]);

  const hasInput = sourceIds.length > 0 && entities.some((entity) => entity.name?.trim());
  const { data, isFetching, error } = useQuery({
    queryKey: ["match-preview", workspaceId, debounced],
    queryFn: async () => {
      const res = await workspaceFetch(workspaceId, "/api/projects/match-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: debounced,
      });
      if (!res.ok) throw new Error("Không xem trước được.");
      return (await res.json()) as PreviewMatchesResult;
    },
    enabled: hasInput,
    placeholderData: keepPreviousData,
  });

  if (!hasInput) {
    return (
      <p className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
        Nhập tên để xem trước số nội dung khớp trên các nguồn đã chọn.
      </p>
    );
  }

  const names = new Map(entities.map((entity) => [entity.id, entity.name]));

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Xem trước trên dữ liệu đã có</h3>
        {isFetching ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {error ? <p className="text-xs text-destructive">Không xem trước được.</p> : null}
      {data ? (
        <>
          <p className="text-xs text-muted-foreground">
            {formatCount(data.scanned)} bài và bình luận trong {data.days} ngày gần nhất. Chỉ so từ
            khóa; bình luận theo ngữ cảnh và ca cần xác nhận sẽ được AI kiểm khi chạy thật.
          </p>
          <ul className="flex flex-col gap-2">
            {data.entities.map((entity) => (
              <li key={entity.id} className="flex flex-col gap-1 text-sm">
                <span>
                  <b>{names.get(entity.id) || "(chưa đặt tên)"}</b>
                  {": "}
                  {formatCount(entity.posts)} bài, {formatCount(entity.comments)} bình luận nhắc tên
                  {entity.needsConfirmation > 0
                    ? ` (${formatCount(entity.needsConfirmation)} cần AI xác nhận)`
                    : ""}
                  {entity.contextComments > 0
                    ? `, ${formatCount(entity.contextComments)} bình luận trong các bài này`
                    : ""}
                </span>
                {entity.samples.length > 0 ? (
                  <details className="text-[13px]">
                    <summary className="cursor-pointer text-muted-foreground">Xem mẫu</summary>
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {entity.samples.map((sample, index) => (
                        <li key={index} className="rounded-lg bg-muted px-2 py-1.5">
                          <span className="mb-1 flex flex-wrap gap-1">
                            {sample.terms.map((term) => (
                              <Badge key={term} variant="outline">
                                {term}
                              </Badge>
                            ))}
                            {sample.needsConfirmation ? (
                              <Badge variant="secondary">cần xác nhận</Badge>
                            ) : null}
                          </span>
                          {sample.text}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
