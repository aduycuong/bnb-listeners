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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { workspacesQueryKey } from "@/hooks/use-workspace-route-context";
import {
  DEFAULT_TOPIC_SCOPE,
  TOPIC_LANGUAGE_OPTIONS,
} from "@/lib/workspaces/constants";
import {
  updateWorkspaceSettingsSchema,
  type UpdateWorkspaceSettingsValues,
} from "@/lib/workspaces/schema";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

type WorkspaceTopicSettingsCardProps = {
  workspace: WorkspaceListItem;
};

function toFormValues(
  workspace: WorkspaceListItem,
): UpdateWorkspaceSettingsValues {
  return {
    topicScope: workspace.topicScope,
    topicLanguage: workspace.topicLanguage,
  };
}

export function WorkspaceTopicSettingsCard({
  workspace,
}: WorkspaceTopicSettingsCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");
  const form = useForm<UpdateWorkspaceSettingsValues>({
    resolver: zodResolver(updateWorkspaceSettingsSchema),
    defaultValues: toFormValues(workspace),
  });

  useEffect(() => {
    form.reset(toFormValues(workspace));
  }, [workspace, form]);

  async function onSubmit(values: UpdateWorkspaceSettingsValues) {
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as { message?: string; error?: string };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save workspace settings.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: data.message ?? "Workspace settings saved.",
      type: "success",
    });
    await queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;
  const topicScopeError = form.formState.errors.topicScope;
  const topicLanguageError = form.formState.errors.topicLanguage;
  const disabled = !canEdit || isSubmitting;

  return (
    <Card>
      <form
        className="flex flex-col gap-(--card-spacing)"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <CardHeader>
          <CardTitle>Topic classification</CardTitle>
          <CardDescription>
            Tell the AI what this workspace covers and which language to use
            for new topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!topicScopeError || undefined}>
              <FieldLabel htmlFor="topic-scope">Topic scope</FieldLabel>
              <Textarea
                id="topic-scope"
                placeholder={DEFAULT_TOPIC_SCOPE}
                aria-invalid={!!topicScopeError}
                disabled={disabled}
                rows={3}
                {...form.register("topicScope")}
              />
              <FieldDescription>
                The domain this workspace's topics should cover. Used when
                scoring relevance, classifying documents, and proposing new
                topics.
              </FieldDescription>
              <FieldError errors={[topicScopeError]} />
            </Field>

            <Field data-invalid={!!topicLanguageError || undefined}>
              <Controller
                name="topicLanguage"
                control={form.control}
                render={({ field }) => (
                  <FieldSet data-slot="radio-group">
                    <FieldLegend variant="label">
                      Generated topic language
                    </FieldLegend>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      {TOPIC_LANGUAGE_OPTIONS.map((option) => (
                        <Field
                          key={option.value}
                          orientation="horizontal"
                          data-invalid={!!topicLanguageError || undefined}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`topic-language-${option.value}`}
                            aria-invalid={!!topicLanguageError}
                            disabled={disabled}
                          />
                          <FieldContent>
                            <FieldLabel
                              htmlFor={`topic-language-${option.value}`}
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
              <FieldError errors={[topicLanguageError]} />
            </Field>
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
