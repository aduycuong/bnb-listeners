"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  projectsQueryKey,
  useProjectRouteContext,
} from "@/hooks/use-project-route-context";
import { updateProjectSchema } from "@/lib/projects/schema";
import type { ProjectListItem } from "@/lib/projects/types";
import { projectFetch } from "@/lib/projects/utils/project-fetch";
import { TERM_LANGUAGE_OPTIONS } from "@/lib/workspaces/constants";
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
    autoCreateTerms: project.autoCreateTerms,
    termLanguage: project.termLanguage,
    termCriteria: project.termCriteria,
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
  const form = useForm<ProjectSettingsValues>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      autoCreateTerms: true,
      termLanguage: "auto",
      termCriteria: "",
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
  const autoCreateTerms = form.watch("autoCreateTerms");

  async function onSubmit(values: ProjectSettingsValues) {
    if (!workspace || !project) {
      return;
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
      return;
    }

    toast.add({
      title: data.message ?? "Project saved.",
      type: "success",
    });
    await queryClient.invalidateQueries({
      queryKey: projectsQueryKey(workspace.id),
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8">
      <Card>
        <form
          className="flex flex-col gap-(--card-spacing)"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <CardHeader>
            <CardTitle>Project settings</CardTitle>
            <CardDescription>
              Name this listening project and set how new terms are created.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="auto-create-terms">
                    Auto-create terms
                  </FieldLabel>
                  <FieldDescription>
                    Khi bật, AI có thể tạo term mới cho tài liệu không khớp term
                    hiện có của project này.
                  </FieldDescription>
                </FieldContent>
                <Controller
                  name="autoCreateTerms"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="auto-create-terms"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  )}
                />
              </Field>
              {autoCreateTerms ? (
                <>
                  <Controller
                    name="termLanguage"
                    control={form.control}
                    render={({ field }) => (
                      <FieldSet>
                        <FieldLegend variant="label">Term language</FieldLegend>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={disabled}
                        >
                          {TERM_LANGUAGE_OPTIONS.map((option) => (
                            <Field key={option.value} orientation="horizontal">
                              <RadioGroupItem
                                value={option.value}
                                id={`project-term-language-${option.value}`}
                                disabled={disabled}
                              />
                              <FieldContent>
                                <FieldLabel
                                  htmlFor={`project-term-language-${option.value}`}
                                >
                                  {option.label}
                                </FieldLabel>
                                <FieldDescription>
                                  {option.description}
                                </FieldDescription>
                              </FieldContent>
                            </Field>
                          ))}
                        </RadioGroup>
                      </FieldSet>
                    )}
                  />
                  <Field>
                    <FieldLabel htmlFor="project-term-criteria">
                      Quy tắc tạo term
                    </FieldLabel>
                    <Textarea
                      id="project-term-criteria"
                      rows={4}
                      disabled={disabled}
                      {...form.register("termCriteria")}
                    />
                    <FieldDescription>
                      Mỗi dòng một quy tắc. Áp dụng khi AI tạo term mới trong
                      project này.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.termCriteria]} />
                  </Field>
                </>
              ) : null}
            </FieldGroup>
          </CardContent>
          {canEdit ? (
            <CardFooter className="justify-end">
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
            </CardFooter>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
