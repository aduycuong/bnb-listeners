"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type FieldPath } from "react-hook-form";

import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import { useAuth } from "@/components/auth/auth-provider";
import { ProjectAlertsFields } from "@/components/projects/config/project-alerts-fields";
import { ProjectAspectsFields } from "@/components/projects/config/project-aspects-fields";
import { ProjectCaseConfigFields } from "@/components/projects/config/project-case-config-fields";
import { ProjectConfigSummary } from "@/components/projects/config/project-config-summary";
import { ProjectEntitiesFields } from "@/components/projects/config/project-entities-fields";
import { ProjectMatchPreview } from "@/components/projects/config/project-match-preview";
import { ProjectSourcesFields } from "@/components/projects/config/project-sources-fields";
import {
  ProjectConfigLiveSummary,
  type ProjectConfigSection,
} from "@/components/projects/config/project-config-live-summary";
import {
  CreateProjectCaseCard,
  CreateProjectStepNav,
  CreateProjectStepProgress,
  type CreateProjectStep,
} from "@/components/projects/create-project-steps";
import {
  PROJECT_FORM_COLUMNS,
  ProjectFormActionBar,
  ProjectFormPage,
} from "@/components/projects/project-form-layout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { fetchProjects, projectsQueryKey } from "@/hooks/use-project-route-context";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useT } from "next-i18next/client";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { PROJECT_CASE_CATALOG } from "@/lib/projects/case-catalog";
import {
  PROJECT_CASE_GROUPS,
  PROJECT_CASE_ICONS,
  isAvailableProjectCase,
  type AvailableProjectCase,
} from "@/lib/projects/project-cases";
import {
  createProjectWithConfigSchema,
  type CreateProjectWithConfigBody,
  type CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import { collectProjectConfigIssues } from "@/lib/projects/utils/collect-project-config-issues";
import { toNewProjectFormValues } from "@/lib/projects/utils/to-project-form-values";
import { cn } from "@/lib/utils";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type FormValues = CreateProjectWithConfigInput;

const STEPS: readonly CreateProjectStep[] = [
  { label: "Kiểu case", hint: "Tình huống cần theo dõi" },
  { label: "Thông tin chung", hint: "Tên và mô tả project" },
  { label: "Nguồn", hint: "Group, page sẽ nghe" },
  { label: "Đối tượng theo dõi", hint: "Tên và alias" },
  { label: "Khía cạnh", hint: "Đo cảm xúc theo chủ đề" },
  { label: "Cảnh báo & báo cáo", hint: "Ngưỡng và người nhận" },
  { label: "Xem lại", hint: "Kiểm tra trước khi tạo" },
];

const STEP_FIELDS: Record<number, FieldPath<FormValues>[]> = {
  1: ["name", "description"],
  2: ["sourceIds"],
  3: ["entities", "caseConfig"],
  4: ["aspects"],
  5: ["alerts"],
};

const STEP_OF_FIELD: Record<string, number> = {
  name: 1,
  description: 1,
  sourceIds: 2,
  entities: 3,
  caseConfig: 3,
  aspects: 4,
  alerts: 5,
};

const STEP_OF_SECTION: Record<ProjectConfigSection, number> = {
  case: 0,
  info: 1,
  sources: 2,
  entities: 3,
  aspects: 4,
  alerts: 5,
};

const ENTITY_STEP_TITLE: Record<AvailableProjectCase, string> = {
  project: "Dự án theo dõi",
  market: "Khu vực theo dõi",
  brand: "Chủ đầu tư và các dự án",
};

export function CreateProjectPage({
  workspaceIndexParam,
}: {
  workspaceIndexParam: string;
}) {
  const { t } = useT("dashboard");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspace, workspaceIndex } = useWorkspaceRouteContext(workspaceIndexParam);
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: projectsQueryKey(workspace?.id ?? "pending"),
    queryFn: () => fetchProjects(workspace!.id),
    enabled: Boolean(workspace),
  });
  const [step, setStep] = useState(0);
  const [projectCase, setProjectCase] = useState<AvailableProjectCase | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues, unknown, CreateProjectWithConfigBody>({
    resolver: zodResolver(createProjectWithConfigSchema),
    defaultValues: toNewProjectFormValues("project"),
  });
  const projectsHref = `/w/${workspaceIndex}/projects`;
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start" });
  }, [step]);

  function chooseCase(next: AvailableProjectCase) {
    if (next !== projectCase) {
      const current = form.getValues();
      form.reset(toNewProjectFormValues(next, current, user?.email));
    }
    setProjectCase(next);
    setStep(1);
  }

  async function validateStep(index: number) {
    if (!projectCase) return false;
    const fields = STEP_FIELDS[index];
    if (!fields) return true;

    let ok = await form.trigger(fields);
    const values = form.getValues();
    const issues = collectProjectConfigIssues(
      {
        case: projectCase,
        caseVersion: values.caseVersion,
        caseConfig: values.caseConfig,
        entities: values.entities,
        aspects: values.aspects,
        alerts: values.alerts,
      },
      { config: index === 3, entities: index === 3, aspects: index === 4, alerts: index === 5 },
    );
    for (const issue of issues) {
      const path = issue.path.join(".");
      form.setError(
        (path === "entities" || path === "aspects" ? `${path}.root` : path) as FieldPath<FormValues>,
        { type: "custom", message: issue.message },
      );
      ok = false;
    }
    return ok;
  }

  async function goNext() {
    if (await validateStep(step)) {
      setStep((current) => Math.min(STEPS.length - 1, current + 1));
    }
  }

  async function onSubmit(values: CreateProjectWithConfigBody) {
    if (!workspace) return;
    setSaving(true);
    try {
      const res = await workspaceFetch(workspace.id, "/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        toast.add({
          title: body.message ?? body.error ?? "Không tạo được project.",
          type: "error",
        });
        return;
      }
      toast.add({ title: body.message ?? "Đã tạo project.", type: "success" });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspace.id) });
      const nextIndex = data?.items.length;
      router.push(
        nextIndex === undefined ? projectsHref : getProjectNavHref(workspaceIndex, nextIndex, ""),
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function onInvalid(errors: FieldErrors<FormValues>) {
    const first = Object.keys(errors)
      .map((key) => STEP_OF_FIELD[key])
      .filter((index): index is number => index !== undefined)
      .sort((a, b) => a - b)[0];
    if (first !== undefined) {
      setStep(first);
    }
    toast.add({
      title: `Còn thông tin chưa hợp lệ${first !== undefined ? ` ở bước ${first + 1}` : ""}.`,
      type: "error",
    });
  }

  if (!workspace) {
    return null;
  }

  const caseLabel = projectCase ? t(`cases.${projectCase}`) : null;
  const nextStep = STEPS[step + 1];

  return (
    <ProjectFormPage
      ref={topRef}
      title="Tạo project"
      description="Project áp cấu hình lên kho dữ liệu dùng chung, không thu thập lại dữ liệu."
    >
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur md:-mx-7 md:px-7 lg:hidden">
        <CreateProjectStepProgress steps={STEPS} current={step} />
      </div>

      <div className={cn("grid flex-1 items-start gap-6", PROJECT_FORM_COLUMNS)}>
        <aside className="sticky top-5 hidden flex-col gap-4 lg:flex">
          <CreateProjectStepNav
            steps={STEPS}
            current={step}
            onSelect={(index) => {
              if (index < step) setStep(index);
            }}
          />
          {projectCase && caseLabel && step > 0 ? (
            <CreateProjectCaseCard
              icon={PROJECT_CASE_ICONS[projectCase]}
              label={caseLabel}
              onChange={() => setStep(0)}
            />
          ) : null}
        </aside>

        <form
          noValidate
          className="min-w-0"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <section className="rounded-[22px] border-[1.5px] border-border bg-card px-4 py-5 md:px-6">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Bước {step + 1}/{STEPS.length}
            </p>
            {step === 0 ? (
              <CaseStep
                selected={projectCase}
                caseLabel={(value) => t(`cases.${value}`)}
                groupLabel={(key) => t(key)}
                onChoose={chooseCase}
              />
            ) : null}

            {step === 1 ? (
              <StepBody title="Thông tin chung">
                <div className="flex flex-col gap-3">
                  <FormFieldText
                    control={form.control}
                    name="name"
                    label="Tên project"
                    placeholder="VD: Dự án La Pura"
                  />
                  <FormFieldTextarea
                    control={form.control}
                    name="description"
                    label="Mô tả"
                    placeholder="Mục tiêu, ai sẽ dùng dashboard này…"
                  />
                </div>
              </StepBody>
            ) : null}

            {step === 3 && projectCase ? (
              <StepBody
                title={ENTITY_STEP_TITLE[projectCase]}
                description="Mỗi mục sinh một truy vấn: nội dung nhắc tới tên hoặc tên gọi khác sẽ được tính là mention."
              >
                <div className="flex flex-col gap-6">
                  <ProjectEntitiesFields form={form} projectCase={projectCase} />
                  <ProjectMatchPreview form={form} workspaceId={workspace.id} />
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">Thông tin của case</h3>
                    <ProjectCaseConfigFields form={form} projectCase={projectCase} />
                  </div>
                </div>
              </StepBody>
            ) : null}

            {step === 4 && projectCase ? (
              <StepBody
                title="Khía cạnh"
                description="Cảm xúc được đo riêng theo từng khía cạnh. Bộ mẫu theo case, sửa được."
              >
                <ProjectAspectsFields form={form} projectCase={projectCase} />
              </StepBody>
            ) : null}

            {step === 2 ? (
              <StepBody
                title="Nguồn theo dõi"
                description="Facebook không cho tìm theo từ khóa, nên project chỉ nghe các group, page đã chọn."
              >
                <ProjectSourcesFields form={form} workspaceId={workspace.id} />
              </StepBody>
            ) : null}

            {step === 5 && projectCase ? (
              <StepBody
                title="Cảnh báo & báo cáo"
                description="Quy tắc gợi ý theo kiểu case. Bỏ chọn hoặc chỉnh ngưỡng theo nhu cầu."
              >
                <ProjectAlertsFields form={form} projectCase={projectCase} />
              </StepBody>
            ) : null}

            {step === 6 && projectCase ? (
              <StepBody title="Xem lại" description="Kiểm tra cấu hình trước khi tạo project.">
                <ReviewStep form={form} workspaceId={workspace.id} caseLabel={t(`cases.${projectCase}`)} />
              </StepBody>
            ) : null}
          </section>
        </form>

        <aside className="sticky top-5 hidden 2xl:block">
          <ProjectConfigLiveSummary
            form={form}
            workspaceId={workspace.id}
            caseLabel={caseLabel}
            sectionState={(section) => {
              const index = STEP_OF_SECTION[section];
              return index < step ? "edit" : index > step ? "upcoming" : "plain";
            }}
            onEdit={(section) => setStep(STEP_OF_SECTION[section])}
          />
        </aside>
      </div>

      <ProjectFormActionBar>
        <Button variant="ghost" nativeButton={false} render={<Link href={projectsHref} />}>
          Hủy
        </Button>
        <div className="flex gap-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => current - 1)}
            >
              <ArrowLeftIcon />
              Quay lại
            </Button>
          ) : null}
          {step > 0 && nextStep ? (
            <Button type="button" onClick={() => void goNext()}>
              <span>
                Tiếp tục<span className="hidden sm:inline">: {nextStep.label}</span>
              </span>
              <ArrowRightIcon />
            </Button>
          ) : null}
          {step === STEPS.length - 1 ? (
            <Button
              type="button"
              disabled={saving}
              onClick={() => void form.handleSubmit(onSubmit, onInvalid)()}
            >
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              Tạo project
            </Button>
          ) : null}
        </div>
      </ProjectFormActionBar>
    </ProjectFormPage>
  );
}

function StepBody({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function CaseStep({
  selected,
  caseLabel,
  groupLabel,
  onChoose,
}: {
  selected: AvailableProjectCase | null;
  caseLabel: (value: string) => string;
  groupLabel: (key: string) => string;
  onChoose: (value: AvailableProjectCase) => void;
}) {
  return (
    <StepBody
      title="Chọn kiểu case"
      description="Mỗi case là một tình huống theo dõi cụ thể, quyết định cấu hình, báo cáo và các trang riêng."
    >
      {PROJECT_CASE_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <h3 className="mb-2 text-sm font-semibold">{groupLabel(group.labelKey)}</h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
            {group.cases.map((value) => {
              const ready = isAvailableProjectCase(value);
              const catalog = PROJECT_CASE_CATALOG[value];
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!ready}
                  aria-pressed={selected === value}
                  className={cn(
                    "rounded-2xl border px-3.5 py-3 text-left transition-colors",
                    selected === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/40",
                    !ready && "cursor-not-allowed opacity-55",
                  )}
                  onClick={() => {
                    if (isAvailableProjectCase(value)) onChoose(value);
                  }}
                >
                  <span className="text-lg">{PROJECT_CASE_ICONS[value]}</span>
                  <b className="mt-1 block text-sm">{caseLabel(value)}</b>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {catalog.description}
                  </span>
                  <small className="mt-1 block text-xs text-muted-foreground">
                    {ready ? `Dành cho: ${catalog.audience}` : "Sắp có"}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </StepBody>
  );
}

function ReviewStep({
  form,
  workspaceId,
  caseLabel,
}: {
  form: Parameters<typeof ProjectEntitiesFields>[0]["form"];
  workspaceId: string;
  caseLabel: string;
}) {
  const values = useWatch({ control: form.control });
  return (
    <ProjectConfigSummary
      values={values as FormValues}
      workspaceId={workspaceId}
      caseLabel={caseLabel}
    />
  );
}
