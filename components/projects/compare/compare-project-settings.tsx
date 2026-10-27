"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { useState } from "react";

import { metricsQueryKey } from "@/components/metrics/use-metrics-api";
import { ProjectFormPage } from "@/components/projects/project-form-layout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { projectsQueryKey } from "@/hooks/use-project-route-context";
import { PROJECT_CASE_ICONS, type CompareCase } from "@/lib/projects/project-cases";
import type { CheckCompareMembersResult, ProjectListItem } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";

import { CompareFormActionBar } from "./compare-form-action-bar";
import { CompareMembersPicker } from "./compare-members-picker";

/** Settings of a compare project (D30): its info and the projects it compares. */
export function CompareProjectSettings({
  workspaceId,
  project,
  compareCase,
  caseLabel,
  canEdit,
  onEditInfo,
  dangerZone,
}: {
  workspaceId: string;
  project: ProjectListItem;
  compareCase: CompareCase;
  caseLabel: string;
  canEdit: boolean;
  onEditInfo: () => void;
  dangerZone?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const membersKey = ["projects", project.id, "compare-members"] as const;
  const { data } = useQuery({
    queryKey: membersKey,
    queryFn: async () => {
      const res = await projectFetch(
        workspaceId,
        project.id,
        `/api/projects/${project.id}/compare-members`,
      );
      if (!res.ok) throw new Error("Không tải được các project so sánh.");
      return (await res.json()) as CheckCompareMembersResult;
    },
  });
  const saved = data?.members.map((member) => member.id) ?? [];
  // Unsaved picks; the saved members until the user changes them.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const memberIds = draft ?? saved;

  async function save() {
    setSaving(true);
    try {
      const res = await projectFetch(
        workspaceId,
        project.id,
        `/api/projects/${project.id}/compare-members`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds }),
        },
      );
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        toast.add({ title: body.message ?? body.error ?? "Không lưu được.", type: "error" });
        return;
      }
      toast.add({ title: body.message ?? "Đã lưu.", type: "success" });
      setDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: membersKey }),
        queryClient.invalidateQueries({ queryKey: metricsQueryKey(project.id) }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) }),
      ]);
    } finally {
      setSaving(false);
    }
  }

  const changed = draft !== null && draft.join(",") !== saved.join(",");

  return (
    <ProjectFormPage
      title="Cài đặt project"
      description={`${PROJECT_CASE_ICONS[compareCase]} ${caseLabel}`}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <section className="flex flex-wrap items-start justify-between gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{project.name}</h2>
            {project.description ? (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={onEditInfo}>
              <PencilIcon />
              Sửa thông tin
            </Button>
          ) : null}
        </section>
        <section className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-5 md:px-6">
          <h2 className="text-base font-semibold">Project so sánh</h2>
          <CompareMembersPicker
            workspaceId={workspaceId}
            compareCase={compareCase}
            value={memberIds}
            onChange={setDraft}
            disabled={!canEdit}
            excludeProjectId={project.id}
          />
        </section>
        {dangerZone}
      </div>
      {canEdit ? (
        <CompareFormActionBar>
          <Button
            type="button"
            variant="ghost"
            disabled={!changed || saving}
            onClick={() => setDraft(null)}
          >
            Hoàn tác
          </Button>
          <Button type="button" disabled={!changed || saving} onClick={() => void save()}>
            {saving ? <Loader2Icon className="animate-spin" /> : null}
            Lưu
          </Button>
        </CompareFormActionBar>
      ) : null}
    </ProjectFormPage>
  );
}
