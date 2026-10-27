"use client";

import { useQuery } from "@tanstack/react-query";
import { useT } from "next-i18next/client";

import { fetchProjects, projectsQueryKey } from "@/hooks/use-project-route-context";
import {
  COMPARE_CASE_OF,
  COMPARE_COMPETITORS,
  PROJECT_CASE_ICONS,
  type CompareCase,
} from "@/lib/projects/project-cases";
import type { CheckCompareMembersResult, ProjectListItem } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

export type CompareMembersValue = { primaryId: string | null; competitorIds: string[] };

/**
 * Picks the primary project of a comparison, then its 1–3 competitors in display order, and
 * shows what the comparison will leave out (D30). Only projects of the compared listening case
 * are listed.
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
  value: CompareMembersValue;
  onChange: (next: CompareMembersValue) => void;
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
      const params = new URLSearchParams({
        case: compareCase,
        primaryId: value.primaryId ?? "",
        competitorIds: value.competitorIds.join(","),
      });
      const res = await workspaceFetch(workspaceId, `/api/projects/compare/check?${params}`);
      if (!res.ok) throw new Error("Không kiểm tra được các project.");
      return (await res.json()) as CheckCompareMembersResult;
    },
    enabled: Boolean(value.primaryId) && value.competitorIds.length >= COMPARE_COMPETITORS.min,
  });
  const candidates = (projects?.items ?? []).filter(
    (project) => project.case === caseOf && project.id !== excludeProjectId,
  );
  const caseLabel = t(`cases.${caseOf}`);

  function choosePrimary(id: string) {
    onChange({ primaryId: id, competitorIds: value.competitorIds.filter((item) => item !== id) });
  }

  function toggleCompetitor(id: string) {
    const { competitorIds } = value;
    if (competitorIds.includes(id)) {
      onChange({ ...value, competitorIds: competitorIds.filter((item) => item !== id) });
    } else if (competitorIds.length < COMPARE_COMPETITORS.max) {
      onChange({ ...value, competitorIds: [...competitorIds, id] });
    }
  }

  if (!candidates.length) {
    return (
      <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
        {isPending
          ? "Đang tải…"
          : `Chưa có project kiểu “${caseLabel}” để so sánh. Tạo các project đó trước.`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h4 className="text-[13px] font-semibold">Project chính</h4>
        <p className="text-[13px] text-muted-foreground">
          Project được so với các đối thủ; trung bình và chênh lệch tính theo project này.
        </p>
        <ProjectCards
          projects={candidates}
          icon={PROJECT_CASE_ICONS[caseOf]}
          badge={(project) => (project.id === value.primaryId ? "★" : "")}
          isPicked={(project) => project.id === value.primaryId}
          isDisabled={() => disabled}
          onPick={(project) => choosePrimary(project.id)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-[13px] font-semibold">Đối thủ</h4>
        <p className="text-[13px] text-muted-foreground">
          Chọn {COMPARE_COMPETITORS.min}–{COMPARE_COMPETITORS.max} project kiểu “{caseLabel}”. Thứ
          tự chọn là thứ tự hiển thị.
        </p>
        <ProjectCards
          projects={candidates.filter((project) => project.id !== value.primaryId)}
          icon={PROJECT_CASE_ICONS[caseOf]}
          badge={(project) => {
            const order = value.competitorIds.indexOf(project.id);
            return order >= 0 ? String(order + 1) : "";
          }}
          isPicked={(project) => value.competitorIds.includes(project.id)}
          isDisabled={(project) =>
            disabled ||
            (!value.competitorIds.includes(project.id) &&
              value.competitorIds.length >= COMPARE_COMPETITORS.max)
          }
          onPick={(project) => toggleCompetitor(project.id)}
        />
      </div>
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

function ProjectCards({
  projects,
  icon,
  badge,
  isPicked,
  isDisabled,
  onPick,
}: {
  projects: ProjectListItem[];
  icon: string;
  badge: (project: ProjectListItem) => string;
  isPicked: (project: ProjectListItem) => boolean;
  isDisabled: (project: ProjectListItem) => boolean;
  onPick: (project: ProjectListItem) => void;
}) {
  if (!projects.length) {
    return <p className="text-[13px] text-muted-foreground">Không còn project khác để chọn.</p>;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
      {projects.map((project) => {
        const picked = isPicked(project);
        return (
          <button
            key={project.id}
            type="button"
            disabled={isDisabled(project)}
            aria-pressed={picked}
            aria-label={project.name}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55",
              picked
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/40",
            )}
            onClick={() => onPick(project)}
          >
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                picked ? "border-primary bg-primary text-white" : "border-border",
              )}
            >
              {badge(project)}
            </span>
            <span className="min-w-0">
              <b className="block truncate">
                {icon} {project.name}
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
  );
}
