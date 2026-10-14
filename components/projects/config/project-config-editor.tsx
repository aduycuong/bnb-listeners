"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { ProjectAlertsFields } from "@/components/projects/config/project-alerts-fields";
import { ProjectAspectsFields } from "@/components/projects/config/project-aspects-fields";
import { ProjectCaseConfigFields } from "@/components/projects/config/project-case-config-fields";
import { ProjectEntitiesFields } from "@/components/projects/config/project-entities-fields";
import { ProjectSourcesFields } from "@/components/projects/config/project-sources-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/components/ui/toast";
import { projectsQueryKey } from "@/hooks/use-project-route-context";
import { PROJECT_CASE_ICONS, isAvailableProjectCase } from "@/lib/projects/project-cases";
import {
  createProjectWithConfigSchema,
  type CreateProjectWithConfigBody,
  type CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import type { ProjectConfigDetail, ProjectListItem } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { toProjectFormValues } from "@/lib/projects/utils/to-project-form-values";

const configQueryKey = (projectId: string) => ["project-config", projectId];

/** Edits entities, queries, aspects, sources and case fields of a real project. */
export function ProjectConfigEditor({
  workspaceId,
  project,
  caseLabel,
  canEdit,
  onEditInfo,
}: {
  workspaceId: string;
  project: ProjectListItem;
  caseLabel: string;
  canEdit: boolean;
  onEditInfo: () => void;
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 md:px-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">
            {PROJECT_CASE_ICONS[project.case]} {project.name}
          </h1>
          <p className="text-[13px] text-muted-foreground">
            {caseLabel}
            {config ? ` · cấu hình phiên bản ${config.configVersion}` : ""}
          </p>
          {project.description ? (
            <p className="mt-1 text-sm">{project.description}</p>
          ) : null}
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={onEditInfo}>
            <PencilIcon />
            Sửa tên, mô tả
          </Button>
        ) : null}
      </div>

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

      {config && projectCase ? (
        <ProjectConfigForm
          key={config.configVersion}
          workspaceId={workspaceId}
          project={project}
          defaultValues={toProjectFormValues(project, { ...config, case: projectCase })}
          canEdit={canEdit}
          onSaved={async (saved) => {
            queryClient.setQueryData(configQueryKey(project.id), saved);
            await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) });
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectConfigForm({
  workspaceId,
  project,
  defaultValues,
  canEdit,
  onSaved,
}: {
  workspaceId: string;
  project: ProjectListItem;
  defaultValues: CreateProjectWithConfigInput;
  canEdit: boolean;
  onSaved: (config: ProjectConfigDetail) => Promise<void>;
}) {
  const form = useForm<CreateProjectWithConfigInput, unknown, CreateProjectWithConfigBody>({
    resolver: zodResolver(createProjectWithConfigSchema),
    defaultValues,
  });
  const projectCase = defaultValues.case;

  async function onSubmit(values: CreateProjectWithConfigBody) {
    const body = {
      case: values.case,
      mode: values.mode,
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
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(onSubmit, () =>
        toast.add({ title: "Còn thông tin chưa hợp lệ.", type: "error" }),
      )}
    >
      <fieldset disabled={!canEdit || form.formState.isSubmitting} className="contents">
        <Section title="Chế độ">
          <Controller
            control={form.control}
            name="mode"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange}>
                {[
                  { value: "live", label: "Live", description: "Chỉ dùng nguồn thật." },
                  {
                    value: "sandbox",
                    label: "Sandbox",
                    description: "Dùng được cả nguồn dữ liệu giả.",
                  },
                ].map((option) => (
                  <Field key={option.value} orientation="horizontal">
                    <RadioGroupItem value={option.value} id={`config-mode-${option.value}`} />
                    <FieldContent>
                      <FieldLabel htmlFor={`config-mode-${option.value}`}>
                        {option.label}
                      </FieldLabel>
                      <FieldDescription>{option.description}</FieldDescription>
                    </FieldContent>
                  </Field>
                ))}
              </RadioGroup>
            )}
          />
        </Section>
        <Section
          title="Đối tượng theo dõi"
          description="Sửa tên, tên gọi khác hoặc điều kiện khớp sẽ tăng phiên bản truy vấn và so khớp lại."
        >
          <ProjectEntitiesFields form={form} projectCase={projectCase} />
        </Section>
        <Section title="Thông tin của case">
          <ProjectCaseConfigFields form={form} projectCase={projectCase} />
        </Section>
        <Section title="Khía cạnh">
          <ProjectAspectsFields form={form} projectCase={projectCase} />
        </Section>
        <Section title="Nguồn theo dõi">
          <ProjectSourcesFields form={form} workspaceId={workspaceId} />
        </Section>
        <Section
          title="Cảnh báo & báo cáo"
          description="Sửa phần này không tăng phiên bản cấu hình và không so khớp lại."
        >
          <ProjectAlertsFields form={form} projectCase={projectCase} />
        </Section>
      </fieldset>
      {canEdit ? (
        <div className="flex items-center justify-end gap-2">
          {form.formState.isDirty ? <Badge variant="secondary">Chưa lưu</Badge> : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
            Lưu cấu hình
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4 md:px-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
