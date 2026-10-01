"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { workspacesQueryKey } from "@/hooks/use-workspace-route-context";
import { DEFAULT_DATA_COLLECTION_SCOPE } from "@/lib/workspaces/constants";
import {
  updateWorkspaceLlmSettingsSchema,
  type UpdateWorkspaceLlmSettingsValues,
} from "@/lib/workspaces/schema";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { hasMinWorkspacePermission } from "@/lib/workspaces/utils/permission-rank";

type WorkspaceLlmSettingsCardProps = {
  workspace: WorkspaceListItem;
};

export function WorkspaceLlmSettingsCard({
  workspace,
}: WorkspaceLlmSettingsCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = hasMinWorkspacePermission(workspace.permission, "edit");
  const form = useForm<UpdateWorkspaceLlmSettingsValues>({
    resolver: zodResolver(updateWorkspaceLlmSettingsSchema),
    defaultValues: {
      dataCollectionScope: workspace.dataCollectionScope,
    },
  });

  useEffect(() => {
    form.reset({ dataCollectionScope: workspace.dataCollectionScope });
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
        title: data.message ?? data.error ?? "Could not save collection scope.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: data.message ?? "Collection scope saved.",
      type: "success",
    });
    await queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;
  const disabled = !canEdit || isSubmitting;

  return (
    <Card>
      <form
        className="flex flex-col gap-(--card-spacing)"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <CardHeader>
          <CardTitle>Collection scope</CardTitle>
          <CardDescription>
            Describes what content this workspace collects. Used when scoring
            documents. Term rules live on each project.
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
              <FieldError
                errors={[form.formState.errors.dataCollectionScope]}
              />
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
