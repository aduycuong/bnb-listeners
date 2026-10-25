"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useT } from "next-i18next/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ProjectConfigEditor } from "@/components/projects/config/project-config-editor";
import {
  projectsQueryKey,
  useProjectRouteContext,
} from "@/hooks/use-project-route-context";
import { updateProjectSchema } from "@/lib/projects/schema";
import type { ProjectListItem } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";
import type { z } from "zod";

type ProjectSettingsValues = z.infer<typeof updateProjectSchema>;

type ProjectSettingsPageProps = {
  workspaceIndexParam: string;
  projectIndexParam: string;
};

function toFormValues(project: ProjectListItem): ProjectSettingsValues {
  return {
    name: project.name,
    description: project.description ?? "",
  };
}

export function ProjectSettingsPage({
  workspaceIndexParam,
  projectIndexParam,
}: ProjectSettingsPageProps) {
  const { workspace, project } = useProjectRouteContext(
    workspaceIndexParam,
    projectIndexParam,
  );
  const queryClient = useQueryClient();
  const { t } = useT("dashboard");
  const [editing, setEditing] = useState(false);
  const form = useForm<ProjectSettingsValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (project) {
      form.reset(toFormValues(project));
    }
  }, [project, form]);

  if (!workspace || !project) {
    return null;
  }

  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");
  const disabled = !canEdit || form.formState.isSubmitting;

  async function onSubmit(values: ProjectSettingsValues) {
    if (!workspace || !project) {
      return false;
    }

    const res = await projectFetch(workspace.id, project.id, `/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        description: values.description?.trim() || null,
      }),
    });
    const data = (await res.json()) as { message?: string; error?: string };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save project.",
        type: "error",
      });
      return false;
    }

    toast.add({
      title: data.message ?? "Project saved.",
      type: "success",
    });
    await queryClient.invalidateQueries({
      queryKey: projectsQueryKey(workspace.id),
    });
    return true;
  }

  return (
    <>
      <ProjectConfigEditor
        workspaceId={workspace.id}
        project={project}
        caseLabel={t(`cases.${project.case}`)}
        canEdit={canEdit}
        onEditInfo={() => setEditing(true)}
      />
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              const saved = await onSubmit(values);
              if (saved) {
                setEditing(false);
              }
            })}
          >
            <DialogHeader>
              <DialogTitle>Chỉnh sửa dự án</DialogTitle>
              <DialogDescription>
                Tên và mô tả của dự án này.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name || undefined}>
                <FieldLabel htmlFor="project-settings-name">Name</FieldLabel>
                <Input
                  id="project-settings-name"
                  disabled={disabled}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-settings-description">
                  Description
                </FieldLabel>
                <Textarea
                  id="project-settings-description"
                  rows={3}
                  disabled={disabled}
                  {...form.register("description")}
                />
              </Field>
            </FieldGroup>
            {canEdit ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2Icon className="animate-spin" data-icon="inline-start" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
