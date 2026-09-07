"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { workspacesQueryKey } from "@/hooks/use-workspace-route-context";
import {
  updateWorkspaceGeneralSchema,
  type UpdateWorkspaceGeneralFormValues,
} from "@/lib/workspaces/schema";
import type { WorkspaceListItem } from "@/lib/workspaces/types";

type EditWorkspaceGeneralDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: WorkspaceListItem;
};

function toFormValues(
  workspace: WorkspaceListItem,
): UpdateWorkspaceGeneralFormValues {
  return {
    name: workspace.name,
    slug: workspace.slug ?? "",
  };
}

export function EditWorkspaceGeneralDialog({
  open,
  onOpenChange,
  workspace,
}: EditWorkspaceGeneralDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<UpdateWorkspaceGeneralFormValues>({
    resolver: zodResolver(updateWorkspaceGeneralSchema),
    defaultValues: toFormValues(workspace),
  });

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(workspace));
    }
  }, [open, workspace, form]);

  async function onSubmit(values: UpdateWorkspaceGeneralFormValues) {
    const res = await fetch(`/api/workspaces/${workspace.id}/general`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as { message?: string; error?: string };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not update workspace.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: data.message ?? "Workspace updated.",
      type: "success",
    });
    onOpenChange(false);
    await queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;
  const nameError = form.formState.errors.name;
  const slugError = form.formState.errors.slug;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit workspace</DialogTitle>
            <DialogDescription>
              Update the workspace name and URL slug.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={!!nameError || undefined}>
              <FieldLabel htmlFor="edit-workspace-name">Name</FieldLabel>
              <Input
                id="edit-workspace-name"
                autoComplete="off"
                placeholder="My workspace"
                aria-invalid={!!nameError}
                disabled={isSubmitting}
                {...form.register("name")}
              />
              <FieldError errors={[nameError]} />
            </Field>
            <Field data-invalid={!!slugError || undefined}>
              <FieldLabel htmlFor="edit-workspace-slug">Slug</FieldLabel>
              <Input
                id="edit-workspace-slug"
                autoComplete="off"
                placeholder="my-workspace"
                aria-invalid={!!slugError}
                disabled={isSubmitting}
                {...form.register("slug")}
              />
              <FieldDescription>
                Used in URLs. Leave blank to generate from the workspace name.
              </FieldDescription>
              <FieldError errors={[slugError]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
