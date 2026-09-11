"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { workspacesQueryKey } from "@/hooks/use-workspace-route-context";
import {
  DEFAULT_DATA_COLLECTION_SCOPE,
  TERM_LANGUAGE_OPTIONS,
} from "@/lib/workspaces/constants";
import {
  updateWorkspaceLlmSettingsSchema,
  type UpdateWorkspaceLlmSettingsValues,
} from "@/lib/workspaces/schema";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

type WorkspaceLlmSettingsCardProps = {
  workspace: WorkspaceListItem;
};

function toFormValues(
  workspace: WorkspaceListItem,
): UpdateWorkspaceLlmSettingsValues {
  return {
    dataCollectionScope: workspace.dataCollectionScope,
    autoCreateTerms: workspace.autoCreateTerms,
    termLanguage: workspace.termLanguage,
    termCriteria: workspace.termCriteria,
  };
}

export function WorkspaceLlmSettingsCard({
  workspace,
}: WorkspaceLlmSettingsCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");
  const form = useForm<UpdateWorkspaceLlmSettingsValues>({
    resolver: zodResolver(updateWorkspaceLlmSettingsSchema),
    defaultValues: toFormValues(workspace),
  });

  useEffect(() => {
    form.reset(toFormValues(workspace));
  }, [workspace, form]);

  async function onSubmit(values: UpdateWorkspaceLlmSettingsValues) {
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as { message?: string; error?: string };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save LLM settings.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: data.message ?? "LLM settings saved.",
      type: "success",
    });
    await queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;
  const disabled = !canEdit || isSubmitting;
  const autoCreateTerms = form.watch("autoCreateTerms");

  return (
    <Card>
      <form
        className="flex flex-col gap-(--card-spacing)"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <CardHeader>
          <CardTitle>LLM settings</CardTitle>
          <CardDescription>
            Configure data collection scope and automatic term creation for
            this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field
              data-invalid={
                !!form.formState.errors.dataCollectionScope || undefined
              }
            >
              <FieldLabel htmlFor="data-collection-scope">
                Data collection scope
              </FieldLabel>
              <Textarea
                id="data-collection-scope"
                placeholder={DEFAULT_DATA_COLLECTION_SCOPE}
                aria-invalid={!!form.formState.errors.dataCollectionScope}
                disabled={disabled}
                rows={3}
                {...form.register("dataCollectionScope")}
              />
              <FieldDescription>
                Describes what content this workspace collects. Used when
                scoring document relevance.
              </FieldDescription>
              <FieldError
                errors={[form.formState.errors.dataCollectionScope]}
              />
            </Field>

            <Field
              orientation="horizontal"
              data-invalid={
                !!form.formState.errors.autoCreateTerms || undefined
              }
            >
              <FieldContent>
                <FieldLabel htmlFor="auto-create-terms">
                  Auto-create terms
                </FieldLabel>
                <FieldDescription>
                  When enabled, the AI can propose and create new terms for
                  documents that do not match existing ones.
                </FieldDescription>
              </FieldContent>
              <Controller
                name="autoCreateTerms"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="auto-create-terms"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                  />
                )}
              />
            </Field>

            {autoCreateTerms ? (
              <>
                <Field
                  data-invalid={
                    !!form.formState.errors.termLanguage || undefined
                  }
                >
                  <Controller
                    name="termLanguage"
                    control={form.control}
                    render={({ field }) => (
                      <FieldSet data-slot="radio-group">
                        <FieldLegend variant="label">Term language</FieldLegend>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={disabled}
                        >
                          {TERM_LANGUAGE_OPTIONS.map((option) => (
                            <Field
                              key={option.value}
                              orientation="horizontal"
                              data-invalid={
                                !!form.formState.errors.termLanguage ||
                                undefined
                              }
                            >
                              <RadioGroupItem
                                value={option.value}
                                id={`term-language-${option.value}`}
                                aria-invalid={
                                  !!form.formState.errors.termLanguage
                                }
                                disabled={disabled}
                              />
                              <FieldContent>
                                <FieldLabel
                                  htmlFor={`term-language-${option.value}`}
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
                  <FieldError errors={[form.formState.errors.termLanguage]} />
                </Field>

                <Field
                  data-invalid={
                    !!form.formState.errors.termCriteria || undefined
                  }
                >
                  <FieldLabel htmlFor="term-criteria">
                    Term criteria
                  </FieldLabel>
                  <Textarea
                    id="term-criteria"
                    placeholder="One criterion per line. Optional."
                    aria-invalid={!!form.formState.errors.termCriteria}
                    disabled={disabled}
                    rows={4}
                    {...form.register("termCriteria")}
                  />
                  <FieldDescription>
                    Extra guidelines for how new terms should be named and
                    described.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.termCriteria]} />
                </Field>
              </>
            ) : null}
          </FieldGroup>
        </CardContent>
        {canEdit ? (
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
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
  );
}
