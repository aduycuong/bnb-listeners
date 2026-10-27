"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field";
import type {
  CreateProjectWithConfigBody,
  CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import type { ListSelectableSourcesResult } from "@/lib/projects/types";
import { groupSelectableSources } from "@/lib/projects/utils/group-selectable-sources";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type ProjectForm = UseFormReturn<
  CreateProjectWithConfigInput,
  unknown,
  CreateProjectWithConfigBody
>;

async function fetchSelectableSources(workspaceId: string) {
  const res = await workspaceFetch(workspaceId, "/api/sources");
  if (!res.ok) throw new Error("Không tải được danh sách nguồn.");
  return (await res.json()) as ListSelectableSourcesResult;
}

export function useSelectableSources(workspaceId: string) {
  return useQuery({
    queryKey: ["selectable-sources", workspaceId],
    queryFn: () => fetchSelectableSources(workspaceId),
  });
}

/** Followed sources. Connector and synthetic sources are both selectable. */
export function ProjectSourcesFields({
  form,
  workspaceId,
}: {
  form: ProjectForm;
  workspaceId: string;
}) {
  const { data, isLoading, error } = useSelectableSources(workspaceId);
  const groups = useMemo(() => groupSelectableSources(data?.items ?? []), [data]);

  useEffect(() => {
    if (!data) return;
    const known = new Set(data.items.map((item) => item.id));
    const selected = form.getValues("sourceIds");
    const allowed = selected.filter((id) => known.has(id));
    if (allowed.length !== selected.length) {
      form.setValue("sourceIds", allowed, { shouldDirty: true });
    }
  }, [data, form]);

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" /> Đang tải nguồn…
      </p>
    );
  }

  if (error || !data) {
    return <p className="text-sm text-destructive">Không tải được danh sách nguồn.</p>;
  }

  return (
    <Controller
      control={form.control}
      name="sourceIds"
      render={({ field, fieldState }) => {
        const values: string[] = field.value ?? [];
        return (
          <div className="flex flex-col gap-2">
            {data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Kho dữ liệu chưa có nguồn nào. Thêm nguồn bằng{" "}
                <code>npm run collect:facebook</code>.
              </p>
            ) : null}
            {groups.map((group) => {
              const groupIds = group.sources.map((source) => source.id);
              const selectedCount = groupIds.filter((id) => values.includes(id)).length;
              const allChecked = selectedCount === groupIds.length;
              return (
                <section key={group.key} className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2 px-1 pt-1">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={allChecked}
                      ref={(input) => {
                        if (input) input.indeterminate = selectedCount > 0 && !allChecked;
                      }}
                      onChange={() =>
                        field.onChange(
                          allChecked
                            ? values.filter((id) => !groupIds.includes(id))
                            : [...values, ...groupIds.filter((id) => !values.includes(id))],
                        )
                      }
                    />
                    <b className="text-sm">{group.label}</b>
                    <small className="text-xs text-muted-foreground">
                      {selectedCount}/{groupIds.length}
                    </small>
                  </label>
                  {group.sources.map((source) => {
                    const checked = values.includes(source.id);
                    return (
                      <label
                        key={source.id}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-3 py-2.5",
                          checked ? "border-primary bg-primary/5" : "border-border",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-primary"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? values.filter((id) => id !== source.id)
                                : [...values, source.id],
                            )
                          }
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex flex-wrap items-center gap-2">
                            <b className="text-sm">{source.name ?? source.url ?? source.id}</b>
                            {source.origin !== "connector" ? (
                              <Badge variant="secondary">dữ liệu giả</Badge>
                            ) : null}
                          </span>
                          <small className="text-xs text-muted-foreground">
                            {source.postCount.toLocaleString("vi-VN")} bài trong kho
                            {source.memberCount
                              ? ` · ${source.memberCount.toLocaleString("vi-VN")} thành viên`
                              : ""}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </section>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Chỉ chọn trong các nguồn đã có trong kho. Nguồn mới được thêm bằng lần thu thập đầu
              tiên (<code>npm run collect:facebook</code>).
            </p>
            <FieldError errors={[fieldState.error]} />
          </div>
        );
      }}
    />
  );
}
