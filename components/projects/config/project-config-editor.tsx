"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircleIcon, Loader2Icon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ProjectAlertsFields } from "@/components/projects/config/project-alerts-fields";
import { ProjectAspectsFields } from "@/components/projects/config/project-aspects-fields";
import { ProjectCaseConfigFields } from "@/components/projects/config/project-case-config-fields";
import {
  ProjectConfigLiveSummary,
  type ProjectConfigSection,
} from "@/components/projects/config/project-config-live-summary";
import { ProjectConfigSectionNav } from "@/components/projects/config/project-config-section-nav";
import { ProjectEntitiesFields } from "@/components/projects/config/project-entities-fields";
import { ProjectMatchPreview } from "@/components/projects/config/project-match-preview";
import { ProjectSourcesFields } from "@/components/projects/config/project-sources-fields";
import {
  PROJECT_FORM_COLUMNS,
  ProjectFormActionBar,
  ProjectFormPage,
} from "@/components/projects/project-form-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { projectsQueryKey } from "@/hooks/use-project-route-context";
import { caseUpgradesAfter } from "@/lib/projects/case-templates";
import { PROJECT_CASE_ICONS, isAvailableProjectCase } from "@/lib/projects/project-cases";
import {
  createProjectWithConfigSchema,
  type CreateProjectWithConfigBody,
  type CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import type { ProjectConfigDetail, ProjectListItem } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import {
  toProjectFormValues,
  toUpgradedFormValues,
} from "@/lib/projects/utils/to-project-form-values";
import { cn } from "@/lib/utils";

const configQueryKey = (projectId: string) => ["project-config", projectId];

type ConfigFormSection = {
  id: string;
  label: string;
  hint: string;
  fields: (keyof CreateProjectWithConfigInput)[];
};

const FORM_SECTIONS = {
  entities: {
    id: "config-entities",
    label: "Đối tượng theo dõi",
    hint: "Tên, alias, điều kiện khớp",
    fields: ["entities"],
  },
  caseConfig: {
    id: "config-case",
    label: "Thông tin của case",
    hint: "Thông số riêng của case",
    fields: ["caseConfig"],
  },
  aspects: {
    id: "config-aspects",
    label: "Khía cạnh",
    hint: "Đo cảm xúc theo chủ đề",
    fields: ["aspects"],
  },
  sources: {
    id: "config-sources",
    label: "Nguồn theo dõi",
    hint: "Group, page đang nghe",
    fields: ["sourceIds"],
  },
  alerts: {
    id: "config-alerts",
    label: "Cảnh báo & báo cáo",
    hint: "Ngưỡng, người nhận, lịch",
    fields: ["alerts"],
  },
} satisfies Record<string, ConfigFormSection>;

/** Form section a "Sửa" link of the live summary scrolls to. */
const SECTION_OF_SUMMARY: Partial<Record<ProjectConfigSection, ConfigFormSection>> = {
  entities: FORM_SECTIONS.entities,
  aspects: FORM_SECTIONS.aspects,
  sources: FORM_SECTIONS.sources,
  alerts: FORM_SECTIONS.alerts,
};

/** True when a react-hook-form dirty-fields entry marks anything as changed. */
function hasDirty(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(hasDirty);
  if (value && typeof value === "object") return Object.values(value).some(hasDirty);
  return false;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Edits entities, queries, aspects, sources and case fields of a real project. */
export function ProjectConfigEditor({
  workspaceId,
  project,
  caseLabel,
  canEdit,
  onEditInfo,
  dangerZone,
}: {
  workspaceId: string;
  project: ProjectListItem;
  caseLabel: string;
  canEdit: boolean;
  onEditInfo: () => void;
  /** Rendered under the config sections, e.g. deleting the project. */
  dangerZone?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: configQueryKey(project.id),
    queryFn: async () => {
      const res = await projectFetch(
        workspaceId,
        project.id,
        `/api/projects/${project.id}/config`,
      );
      if (!res.ok) throw new Error("Không tải được cấu hình.");
      return (await res.json()) as ProjectConfigDetail;
    },
  });
  const projectCase = config && isAvailableProjectCase(config.case) ? config.case : null;
  // Bumped on every save so the form remounts with the saved values.
  const [savedCount, setSavedCount] = useState(0);
  const [upgradeTo, setUpgradeTo] = useState<number | null>(null);
  const upgrades = config && projectCase ? caseUpgradesAfter(projectCase, config.caseVersion) : [];
  const latest = upgrades[upgrades.length - 1];
  const savedValues =
    config && projectCase ? toProjectFormValues(project, { ...config, case: projectCase }) : null;

  return (
    <ProjectFormPage
      title={
        <>
          {PROJECT_CASE_ICONS[project.case]} {project.name}
        </>
      }
      description={
        <>
          <p>
            {caseLabel}
            {config ? ` · case v${config.caseVersion} · cấu hình v${config.configVersion}` : ""}
          </p>
          {project.description ? (
            <p className="mt-1 text-sm text-foreground">{project.description}</p>
          ) : null}
        </>
      }
      actions={
        canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={onEditInfo}>
            <PencilIcon />
            Sửa tên, mô tả
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" /> Đang tải cấu hình…
        </p>
      ) : null}

      {config && !projectCase ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-[13px]">
          Kiểu case này chưa hỗ trợ cấu hình.
        </p>
      ) : null}

      {config && projectCase && savedValues ? (
        <ProjectConfigForm
          key={`${config.caseVersion}-${savedCount}-${upgradeTo ?? "current"}`}
          workspaceId={workspaceId}
          project={project}
          defaultValues={
            upgradeTo !== null ? toUpgradedFormValues(savedValues, upgradeTo) : savedValues
          }
          caseLabel={caseLabel}
          canEdit={canEdit}
          onEditInfo={onEditInfo}
          dangerZone={dangerZone}
          notices={
            <>
              {latest && upgradeTo === null ? (
                <section className="flex flex-col gap-2 rounded-[22px] border-[1.5px] border-primary/40 bg-primary/5 px-4 py-4 md:px-5">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <ArrowUpCircleIcon className="size-4" />
                    Có phiên bản case mới: v{latest.version}
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    Project vẫn chạy bình thường ở v{config.caseVersion}. Chỉ nâng cấp khi muốn
                    dùng các thay đổi dưới đây.
                  </p>
                  <ul className="list-disc pl-5 text-sm">
                    {upgrades.flatMap((version) =>
                      (version.upgrade?.notes ?? []).map((note) => (
                        <li key={`${version.version}-${note}`}>
                          v{version.version}: {note}
                        </li>
                      )),
                    )}
                  </ul>
                  {canEdit ? (
                    <div>
                      <Button type="button" size="sm" onClick={() => setUpgradeTo(latest.version)}>
                        Xem cấu hình phiên bản mới
                      </Button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {upgradeTo !== null ? (
                <section className="flex flex-wrap items-center justify-between gap-2 rounded-[22px] border-[1.5px] border-primary/40 bg-primary/5 px-4 py-3 md:px-5">
                  <p className="text-sm">
                    Đang cấu hình theo case v{upgradeTo}. Kiểm tra và bổ sung rồi lưu để nâng
                    cấp; chưa lưu thì project vẫn ở v{config.caseVersion}.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUpgradeTo(null)}
                  >
                    Giữ phiên bản hiện tại
                  </Button>
                </section>
              ) : null}
            </>
          }
          onSaved={async (saved) => {
            queryClient.setQueryData(configQueryKey(project.id), saved);
            setUpgradeTo(null);
            setSavedCount((count) => count + 1);
            await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) });
          }}
        />
      ) : null}
    </ProjectFormPage>
  );
}

function ProjectConfigForm({
  workspaceId,
  project,
  defaultValues,
  caseLabel,
  canEdit,
  onEditInfo,
  notices,
  dangerZone,
  onSaved,
}: {
  workspaceId: string;
  project: ProjectListItem;
  defaultValues: CreateProjectWithConfigInput;
  caseLabel: string;
  canEdit: boolean;
  onEditInfo: () => void;
  notices: React.ReactNode;
  dangerZone?: React.ReactNode;
  onSaved: (config: ProjectConfigDetail) => Promise<void>;
}) {
  const form = useForm<CreateProjectWithConfigInput, unknown, CreateProjectWithConfigBody>({
    resolver: zodResolver(createProjectWithConfigSchema),
    defaultValues,
  });
  const projectCase = defaultValues.case;
  const { dirtyFields, errors, isDirty, isSubmitting } = form.formState;
  const navItems = Object.values(FORM_SECTIONS).map((section) => ({
    id: section.id,
    label: section.label,
    hint: section.hint,
    dirty: section.fields.some((field) => hasDirty(dirtyFields[field])),
    invalid: section.fields.some((field) => errors[field] !== undefined),
  }));
  const dirtyCount = navItems.filter((item) => item.dirty).length;

  async function onSubmit(values: CreateProjectWithConfigBody) {
    const body = {
      case: values.case,
      caseVersion: values.caseVersion,
      caseConfig: values.caseConfig,
      entities: values.entities,
      aspects: values.aspects,
      sourceIds: values.sourceIds,
      alerts: values.alerts,
    };
    const res = await projectFetch(
      workspaceId,
      project.id,
      `/api/projects/${project.id}/config`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json()) as ProjectConfigDetail & {
      message?: string;
      error?: string;
    };
    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Không lưu được cấu hình.",
        type: "error",
      });
      return;
    }
    toast.add({ title: data.message ?? "Đã lưu cấu hình.", type: "success" });
    await onSaved(data);
  }

  return (
    <form
      noValidate
      className="flex flex-1 flex-col"
      onSubmit={form.handleSubmit(onSubmit, () =>
        toast.add({ title: "Còn thông tin chưa hợp lệ.", type: "error" }),
      )}
    >
      <div className={cn("grid flex-1 items-start gap-6", PROJECT_FORM_COLUMNS)}>
        <aside className="sticky top-5 hidden lg:block">
          <ProjectConfigSectionNav items={navItems} />
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          {notices}
          <fieldset disabled={!canEdit || isSubmitting} className="contents">
            <Section
              {...FORM_SECTIONS.entities}
              description="Sửa tên, tên gọi khác hoặc điều kiện khớp sẽ tăng phiên bản truy vấn và so khớp lại."
            >
              <ProjectEntitiesFields form={form} projectCase={projectCase} />
              <ProjectMatchPreview form={form} workspaceId={workspaceId} />
            </Section>
            <Section {...FORM_SECTIONS.caseConfig}>
              <ProjectCaseConfigFields form={form} projectCase={projectCase} />
            </Section>
            <Section {...FORM_SECTIONS.aspects}>
              <ProjectAspectsFields form={form} projectCase={projectCase} />
            </Section>
            <Section {...FORM_SECTIONS.sources}>
              <ProjectSourcesFields form={form} workspaceId={workspaceId} />
            </Section>
            <Section
              {...FORM_SECTIONS.alerts}
              description="Sửa phần này không tăng phiên bản cấu hình và không so khớp lại."
            >
              <ProjectAlertsFields form={form} projectCase={projectCase} />
            </Section>
          </fieldset>
          {dangerZone}
        </div>

        <aside className="sticky top-5 hidden 2xl:block">
          <ProjectConfigLiveSummary
            form={form}
            workspaceId={workspaceId}
            caseLabel={caseLabel}
            projectName={project.name}
            sectionState={(section) =>
              canEdit && (section === "info" || SECTION_OF_SUMMARY[section]) ? "edit" : "plain"
            }
            onEdit={(section) => {
              if (section === "info") onEditInfo();
              const target = SECTION_OF_SUMMARY[section];
              if (target) scrollToSection(target.id);
            }}
          />
        </aside>
      </div>

      {canEdit ? (
        <ProjectFormActionBar>
          <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
            {isDirty ? (
              <>
                <Badge variant="secondary">Chưa lưu</Badge>
                {dirtyCount > 0 ? `${dirtyCount} phần thay đổi` : null}
              </>
            ) : (
              "Không có thay đổi chưa lưu"
            )}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isSubmitting}
              onClick={() => form.reset()}
            >
              <RotateCcwIcon />
              Hoàn tác
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
              Lưu cấu hình
            </Button>
          </div>
        </ProjectFormActionBar>
      ) : (
        <div className="h-6" />
      )}
    </form>
  );
}

function Section({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-5 flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-5 md:px-6"
    >
      <div className="border-b border-border pb-3">
        <h2 className="text-lg font-semibold">{label}</h2>
        {description ? (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
