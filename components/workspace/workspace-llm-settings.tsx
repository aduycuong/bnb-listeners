"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, RotateCcwIcon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { SettingsPageLayout } from "@/components/dashboard/settings-page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { workspaceLlmPromptsQueryKey } from "@/components/workspace/workspace-llm-query-keys";
import { TOPIC_LANGUAGE_OPTIONS } from "@/lib/llm/constants";
import {
  updateWorkspaceLlmSettingsSchema,
  type UpdateWorkspaceLlmSettingsBody,
} from "@/lib/llm/schema";
import type { GetWorkspaceLlmSettingsResult } from "@/lib/llm/types";
import {
  buildProposeTopicPrompt,
  buildScoreRelevancePrompt,
  normalizeProposeTopicSettings,
  normalizeScoreRelevanceSettings,
} from "@/lib/llm/utils/build-system-prompt-from-settings";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";
import { cn } from "@/lib/utils";

type WorkspaceLlmSettingsProps = {
  workspace: WorkspaceListItem;
};

async function fetchWorkspaceLlmSettings(
  workspaceId: string,
): Promise<GetWorkspaceLlmSettingsResult> {
  const res = await workspaceFetch(workspaceId, "/api/workspace-llm-prompts");
  const data = (await res.json()) as GetWorkspaceLlmSettingsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load LLM settings.");
  }

  return data;
}

function toFormValues(
  data: GetWorkspaceLlmSettingsResult,
): UpdateWorkspaceLlmSettingsBody {
  return {
    proposeTopic: data.proposeTopic.settings,
    scoreRelevance: data.scoreRelevance.settings,
  };
}

function PromptPreview({ value }: { value: string }) {
  return (
    <pre className="max-h-48 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
      {value}
    </pre>
  );
}

export function WorkspaceLlmSettings({ workspace }: WorkspaceLlmSettingsProps) {
  const queryClient = useQueryClient();
  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");

  const { data, isLoading, error } = useQuery({
    queryKey: workspaceLlmPromptsQueryKey(workspace.id),
    queryFn: () => fetchWorkspaceLlmSettings(workspace.id),
  });

  const form = useForm<UpdateWorkspaceLlmSettingsBody>({
    resolver: zodResolver(updateWorkspaceLlmSettingsSchema),
    defaultValues: {
      proposeTopic: { topicLanguage: "auto", guidelines: "" },
      scoreRelevance: {
        domainDescription: "a curated knowledge workspace",
        scoringGuide: "",
      },
    },
  });

  useEffect(() => {
    if (data) {
      form.reset(toFormValues(data));
    }
  }, [data, form]);

  async function onSubmit(values: UpdateWorkspaceLlmSettingsBody) {
    const res = await workspaceFetch(workspace.id, "/api/workspace-llm-prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const responseData = (await res.json()) as { message?: string; error?: string };

    if (!res.ok) {
      toast.add({
        title:
          responseData.message ??
          responseData.error ??
          "Could not save LLM settings.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: responseData.message ?? "LLM settings saved.",
      type: "success",
    });
    await queryClient.invalidateQueries({
      queryKey: workspaceLlmPromptsQueryKey(workspace.id),
    });
  }

  function handleResetProposeTopic() {
    if (!data) return;
    form.setValue("proposeTopic", data.proposeTopic.defaultSettings, {
      shouldDirty: true,
    });
  }

  function handleResetScoreRelevance() {
    if (!data) return;
    form.setValue("scoreRelevance", data.scoreRelevance.defaultSettings, {
      shouldDirty: true,
    });
  }

  const isSubmitting = form.formState.isSubmitting;
  const disabled = !canEdit || isSubmitting;
  const watchedValues = form.watch();

  return (
    <SettingsPageLayout
      title="LLM settings"
      description="Configure how the AI proposes topics and scores document relevance. Topic classification always uses the built-in default prompt."
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <form
          className="space-y-6"
          id="workspace-llm-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Propose topic</CardTitle>
                  <CardDescription>
                    Used when a document does not match any existing topic.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      data?.proposeTopic.isCustom
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {data?.proposeTopic.isCustom ? "Custom" : "Default"}
                  </span>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetProposeTopic}
                      disabled={disabled}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.proposeTopic?.topicLanguage}>
                  <Controller
                    name="proposeTopic.topicLanguage"
                    control={form.control}
                    render={({ field }) => (
                      <FieldSet data-slot="radio-group">
                        <FieldLegend variant="label">Topic language</FieldLegend>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={disabled}
                        >
                          {TOPIC_LANGUAGE_OPTIONS.map((option) => (
                            <Field
                              key={option.value}
                              orientation="horizontal"
                            >
                              <RadioGroupItem
                                value={option.value}
                                id={`propose-language-${option.value}`}
                                disabled={disabled}
                              />
                              <FieldContent>
                                <FieldLabel htmlFor={`propose-language-${option.value}`}>
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
                  <FieldError
                    errors={[form.formState.errors.proposeTopic?.topicLanguage]}
                  />
                </Field>

                <Field data-invalid={!!form.formState.errors.proposeTopic?.guidelines}>
                  <FieldLabel htmlFor="propose-guidelines">
                    Extra guidelines
                  </FieldLabel>
                  <Textarea
                    id="propose-guidelines"
                    rows={4}
                    disabled={disabled}
                    placeholder="One guideline per line. Optional."
                    {...form.register("proposeTopic.guidelines")}
                  />
                  <FieldDescription>
                    Appended as bullet points to the propose-topic prompt.
                  </FieldDescription>
                  <FieldError
                    errors={[form.formState.errors.proposeTopic?.guidelines]}
                  />
                </Field>
              </FieldGroup>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Prompt preview
                </p>
                <PromptPreview
                  value={
                    data
                      ? buildPreviewProposeTopic(
                          watchedValues.proposeTopic,
                          data.proposeTopic.defaultSettings,
                        )
                      : ""
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Score relevance</CardTitle>
                  <CardDescription>
                    Used during document quality scoring before chunking.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      data?.scoreRelevance.isCustom
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {data?.scoreRelevance.isCustom ? "Custom" : "Default"}
                  </span>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetScoreRelevance}
                      disabled={disabled}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldGroup>
                <Field
                  data-invalid={
                    !!form.formState.errors.scoreRelevance?.domainDescription
                  }
                >
                  <FieldLabel htmlFor="relevance-domain">
                    Relevance context
                  </FieldLabel>
                  <Input
                    id="relevance-domain"
                    disabled={disabled}
                    placeholder="a curated knowledge workspace"
                    {...form.register("scoreRelevance.domainDescription")}
                  />
                  <FieldDescription>
                    Describes what the content is being scored against, e.g.
                    &quot;news and market data about renewable energy&quot;.
                  </FieldDescription>
                  <FieldError
                    errors={[
                      form.formState.errors.scoreRelevance?.domainDescription,
                    ]}
                  />
                </Field>

                <Field
                  data-invalid={!!form.formState.errors.scoreRelevance?.scoringGuide}
                >
                  <FieldLabel htmlFor="relevance-scoring-guide">
                    Custom scoring guide
                  </FieldLabel>
                  <Textarea
                    id="relevance-scoring-guide"
                    rows={6}
                    disabled={disabled}
                    placeholder="Leave empty to use the default 0–10 scoring guide."
                    {...form.register("scoreRelevance.scoringGuide")}
                  />
                  <FieldDescription>
                    Optional. Replaces the built-in scoring guide when non-empty.
                  </FieldDescription>
                  <FieldError
                    errors={[form.formState.errors.scoreRelevance?.scoringGuide]}
                  />
                </Field>
              </FieldGroup>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Prompt preview
                </p>
                <PromptPreview
                  value={
                    data
                      ? buildPreviewScoreRelevance(
                          watchedValues.scoreRelevance,
                          data.scoreRelevance.defaultSettings,
                        )
                      : ""
                  }
                />
              </div>
            </CardContent>
          </Card>

          {canEdit ? (
            <div className="flex justify-end">
              <Button type="submit" form="workspace-llm-settings-form" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="animate-spin" data-icon="inline-start" />
                    Saving…
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
            </div>
          ) : null}
        </form>
      )}
    </SettingsPageLayout>
  );
}

function buildPreviewProposeTopic(
  settings: UpdateWorkspaceLlmSettingsBody["proposeTopic"],
  defaults: UpdateWorkspaceLlmSettingsBody["proposeTopic"],
) {
  return buildProposeTopicPrompt(
    normalizeProposeTopicSettings({
      topicLanguage: settings.topicLanguage ?? defaults.topicLanguage,
      guidelines: settings.guidelines ?? defaults.guidelines,
    }),
  );
}

function buildPreviewScoreRelevance(
  settings: UpdateWorkspaceLlmSettingsBody["scoreRelevance"],
  defaults: UpdateWorkspaceLlmSettingsBody["scoreRelevance"],
) {
  return buildScoreRelevancePrompt(
    normalizeScoreRelevanceSettings({
      domainDescription:
        settings.domainDescription || defaults.domainDescription,
      scoringGuide: settings.scoringGuide ?? defaults.scoringGuide,
    }),
  );
}
