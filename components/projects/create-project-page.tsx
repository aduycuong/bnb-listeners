"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";

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
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const STEPS = [
  "Kiểu case",
  "Thông tin chung",
  "Nguồn",
  "Đối tượng theo dõi",
  "Khía cạnh",
  "Cảnh báo & báo cáo",
  "Xem lại",
] as const;

const STEP_FIELDS: Record<number, FieldPath<FormValues>[]> = {
  1: ["name", "description", "mode"],
  2: ["sourceIds"],
  3: ["entities", "caseConfig"],
  4: ["aspects"],
  5: ["alerts"],
};

const STEP_OF_FIELD: Record<string, number> = {
  name: 1,
  description: 1,
  mode: 1,
  sourceIds: 2,
  entities: 3,
  caseConfig: 3,
  aspects: 4,
  alerts: 5,
};

const ENTITY_STEP_TITLE: Record<AvailableProjectCase, string> = {
  project: "Dự án và đối thủ",
  market: "Khu vực theo dõi",
  brand: "Chủ đầu tư, dự án và đối thủ",
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

  return (
    <div
      ref={topRef}
      className="mx-auto flex w-full max-w-4xl scroll-mt-16 flex-col gap-4 px-4 py-5 md:px-7"
    >
      <div>
        <h1 className="font-heading text-xl font-bold">Tạo project</h1>
        <p className="text-[13px] text-muted-foreground">
          Project áp cấu hình lên kho dữ liệu dùng chung, không thu thập lại dữ liệu.
        </p>
      </div>
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={index > step}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px]",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
              )}
              onClick={() => {
                if (index < step) setStep(index);
              }}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white/20 text-xs font-semibold">
                {index < step ? "✓" : index + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <section className="rounded-[22px] border-[1.5px] border-border bg-card px-4 py-4 md:px-5">
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
                <Controller
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FieldSet>
                      <FieldLegend variant="label">Chế độ</FieldLegend>
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        {[
                          {
                            value: "live",
                            label: "Live",
                            description: "Chỉ dùng nguồn thật. Số liệu dùng được cho khách hàng.",
                          },
                          {
                            value: "sandbox",
                            label: "Sandbox",
                            description: "Dùng được cả nguồn dữ liệu giả, để thử cấu hình và đo Match.",
                          },
                        ].map((option) => (
                          <Field key={option.value} orientation="horizontal">
                            <RadioGroupItem value={option.value} id={`project-mode-${option.value}`} />
                            <FieldContent>
                              <FieldLabel htmlFor={`project-mode-${option.value}`}>
                                {option.label}
                              </FieldLabel>
                              <FieldDescription>{option.description}</FieldDescription>
                            </FieldContent>
                          </Field>
                        ))}
                      </RadioGroup>
                    </FieldSet>
                  )}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" nativeButton={false} render={<Link href={projectsHref} />}>
          Hủy
        </Button>
        <div className="flex gap-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
              Quay lại
            </Button>
          ) : null}
          {step > 0 && step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => void goNext()}>
              Tiếp tục
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
      </div>
    </div>
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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-[13px] text-muted-foreground">{description}</p>
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
          <div className="grid gap-2 md:grid-cols-2">
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
                    "rounded-2xl border px-3 py-3 text-left",
                    selected === value ? "border-primary bg-primary/5" : "border-border",
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
