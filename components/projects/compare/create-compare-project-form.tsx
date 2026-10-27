"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { useT } from "next-i18next/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import { ProjectFormPage } from "@/components/projects/project-form-layout";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { projectsQueryKey } from "@/hooks/use-project-route-context";
import { getProjectNavHref } from "@/lib/dashboard/nav-items";
import { PROJECT_CASE_ICONS, type CompareCase } from "@/lib/projects/project-cases";
import {
  createCompareProjectSchema,
  type CreateCompareProjectBody,
  type CreateCompareProjectInput,
} from "@/lib/projects/schema";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

import { CompareFormActionBar } from "./compare-form-action-bar";
import { CompareMembersPicker } from "./compare-members-picker";

/** Create form of a compare project (D30): name, description and the projects to compare. */
export function CreateCompareProjectForm({
  workspaceId,
  workspaceIndex,
  compareCase,
  nextProjectIndex,
  onBack,
}: {
  workspaceId: string;
  workspaceIndex: number;
  compareCase: CompareCase;
  /** Index the new project gets in the workspace list, to open it after creating. */
  nextProjectIndex: number | undefined;
  onBack: () => void;
}) {
  const { t } = useT("dashboard");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const form = useForm<CreateCompareProjectInput, unknown, CreateCompareProjectBody>({
    resolver: zodResolver(createCompareProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      case: compareCase,
      primaryId: "",
      competitorIds: [],
    },
  });

  const primaryId = useWatch({ control: form.control, name: "primaryId" });
  const competitorIds = useWatch({ control: form.control, name: "competitorIds" });

  async function onSubmit(values: CreateCompareProjectBody) {
    setSaving(true);
    try {
      const res = await workspaceFetch(workspaceId, "/api/projects/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        toast.add({ title: body.message ?? body.error ?? "Không tạo được project.", type: "error" });
        return;
      }
      toast.add({ title: body.message ?? "Đã tạo project.", type: "success" });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey(workspaceId) });
      router.push(
        nextProjectIndex === undefined
          ? `/w/${workspaceIndex}/projects`
          : getProjectNavHref(workspaceIndex, nextProjectIndex, ""),
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProjectFormPage
      title="Tạo project"
      description="Project so sánh chỉ đọc số liệu của các project đã có, không có nguồn hay đối tượng riêng."
    >
      <form
        noValidate
        className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-[22px] border-[1.5px] border-border bg-card px-4 py-5 md:px-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="text-sm font-semibold">
          {PROJECT_CASE_ICONS[compareCase]} {t(`cases.${compareCase}`)}
        </p>
        <FormFieldText
          control={form.control}
          name="name"
          label="Tên project"
          placeholder="VD: So sánh dự án trục QL13"
        />
        <FormFieldTextarea
          control={form.control}
          name="description"
          label="Mô tả"
          placeholder="So sánh để làm gì, ai sẽ dùng…"
        />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Project so sánh</h3>
          <CompareMembersPicker
            workspaceId={workspaceId}
            compareCase={compareCase}
            value={{ primaryId: primaryId || null, competitorIds: competitorIds ?? [] }}
            onChange={(next) => {
              form.setValue("primaryId", next.primaryId ?? "", {
                shouldValidate: form.formState.isSubmitted,
              });
              form.setValue("competitorIds", next.competitorIds, {
                shouldValidate: form.formState.isSubmitted,
              });
            }}
          />
          {[form.formState.errors.primaryId, form.formState.errors.competitorIds].map((error) =>
            error?.message ? (
              <p key={error.message} className="text-sm text-destructive">
                {error.message}
              </p>
            ) : null,
          )}
        </div>
      </form>

      <CompareFormActionBar>
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeftIcon />
          Đổi kiểu case
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void form.handleSubmit(onSubmit)()}
        >
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          Tạo project
        </Button>
      </CompareFormActionBar>
    </ProjectFormPage>
  );
}
