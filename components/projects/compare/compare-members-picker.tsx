"use client";

import { useQuery } from "@tanstack/react-query";
import { useT } from "next-i18next/client";

import { fetchProjects, projectsQueryKey } from "@/hooks/use-project-route-context";
import {
  COMPARE_CASE_OF,
  COMPARE_MEMBERS,
  PROJECT_CASE_ICONS,
  type CompareCase,
} from "@/lib/projects/project-cases";
import type { CheckCompareMembersResult } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

/**
 * Picks the 2–4 projects a compare project reads, in the order they are picked, and shows what
 * the comparison will leave out (D30). Only projects of the compared listening case are listed.
 */
export function CompareMembersPicker({
  workspaceId,
  compareCase,
  value,
  onChange,
  disabled = false,
  excludeProjectId,
}: {
  workspaceId: string;
  compareCase: CompareCase;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** The compare project itself, when editing. */
  excludeProjectId?: string;
}) {
  const { t } = useT("dashboard");
  const caseOf = COMPARE_CASE_OF[compareCase];
  const { data: projects, isPending } = useQuery({
    queryKey: projectsQueryKey(workspaceId),
    queryFn: () => fetchProjects(workspaceId),
  });
  const { data: check } = useQuery({
    queryKey: ["projects", workspaceId, "compare-check", compareCase, value],
    queryFn: async () => {
      const params = new URLSearchParams({ case: compareCase, memberIds: value.join(",") });
      const res = await workspaceFetch(workspaceId, `/api/projects/compare/check?${params}`);
      if (!res.ok) throw new Error("Không kiểm tra được các project.");
      return (await res.json()) as CheckCompareMembersResult;
    },
    enabled: value.length >= COMPARE_MEMBERS.min,
  });
  const candidates = (projects?.items ?? []).filter(
    (project) => project.case === caseOf && project.id !== excludeProjectId,
  );

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (value.length < COMPARE_MEMBERS.max) onChange([...value, id]);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-muted-foreground">
        Chọn {COMPARE_MEMBERS.min}–{COMPARE_MEMBERS.max} project kiểu “{t(`cases.${caseOf}`)}”. Thứ
        tự chọn là thứ tự hiển thị.
      </p>
      {candidates.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
          {candidates.map((project) => {
            const order = value.indexOf(project.id);
            const picked = order >= 0;
            return (
              <button
                key={project.id}
                type="button"
                disabled={disabled || (!picked && value.length >= COMPARE_MEMBERS.max)}
                aria-pressed={picked}
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55",
                  picked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40",
                )}
                onClick={() => toggle(project.id)}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                    picked ? "border-primary bg-primary text-white" : "border-border",
                  )}
                >
                  {picked ? order + 1 : ""}
                </span>
                <span className="min-w-0">
                  <b className="block truncate">
                    {PROJECT_CASE_ICONS[caseOf]} {project.name}
                  </b>
                  {project.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {project.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          {isPending
            ? "Đang tải…"
            : `Chưa có project kiểu “${t(`cases.${caseOf}`)}” để so sánh. Tạo các project đó trước.`}
        </p>
      )}
      {check?.issues.length ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {check.issues.join(" ")}
        </p>
      ) : null}
      {check?.warnings.map((warning) => (
        <p key={warning} className="rounded-xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          {warning}
        </p>
      ))}
      {check?.sharedAspects.length ? (
        <p className="text-[13px] text-muted-foreground">
          Khía cạnh được so sánh: {check.sharedAspects.map((aspect) => aspect.name).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
