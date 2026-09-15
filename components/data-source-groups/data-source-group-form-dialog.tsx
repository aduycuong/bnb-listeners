"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { DATA_SOURCE_GROUP_CONFIG } from "@/lib/data-source-groups/data-source-group-config";
import { dataSourceGroupFormSchema } from "@/lib/data-source-groups/schema";
import type {
  DataSourceGroupFormValues,
  DataSourceGroupListItem,
} from "@/lib/data-source-groups/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceGroupFormTarget = Pick<
  DataSourceGroupListItem,
  "id" | "name" | "description"
>;

function groupToFormValues(
  group?: DataSourceGroupFormTarget,
): DataSourceGroupFormValues {
  return {
    name: group?.name ?? "",
    description: group?.description ?? "",
  };
}

type DataSourceGroupFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  group?: DataSourceGroupFormTarget;
  onSaved: () => Promise<void>;
};

export function DataSourceGroupFormDialog({
  open,
  onOpenChange,
  workspaceId,
  group,
  onSaved,
}: DataSourceGroupFormDialogProps) {
  const mode = group ? "edit" : "create";
  const form = useForm<DataSourceGroupFormValues>({
    resolver: zodResolver(dataSourceGroupFormSchema),
    defaultValues: groupToFormValues(group),
  });

  useEffect(() => {
    if (open) {
      form.reset(groupToFormValues(group));
    }
  }, [open, group, form]);

  async function onSubmit(values: DataSourceGroupFormValues) {
    const description = values.description.trim();

    const body =
      mode === "create"
        ? {
            name: values.name.trim(),
            description: description || undefined,
          }
        : {
            name: values.name.trim(),
            description: description || null,
          };

    const url =
      mode === "create"
        ? "/api/data-source-groups"
        : `/api/data-source-groups/${group?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await workspaceFetch(workspaceId, url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      toast.add({
        title:
          data.message ??
          data.error ??
          (mode === "create"
            ? "Could not create group."
            : "Could not update group."),
        type: "error",
      });
      return;
    }

    toast.add({
      title: mode === "create" ? "Group created." : "Group updated.",
      type: "success",
    });
    onOpenChange(false);
    await onSaved();
  }

  const isSubmitting = form.formState.isSubmitting;
  const nameError = form.formState.errors.name;
  const descriptionError = form.formState.errors.description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? DATA_SOURCE_GROUP_CONFIG.formCreateTitle
                : DATA_SOURCE_GROUP_CONFIG.formEditTitle}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? DATA_SOURCE_GROUP_CONFIG.formCreateDescription
                : DATA_SOURCE_GROUP_CONFIG.formEditDescription}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!nameError || undefined}>
              <FieldLabel htmlFor="data-source-group-name">Name</FieldLabel>
              <Input
                id="data-source-group-name"
                placeholder="Competitors"
                aria-invalid={!!nameError}
                disabled={isSubmitting}
                {...form.register("name")}
              />
              <FieldDescription>
                Must be unique in this workspace.
              </FieldDescription>
              <FieldError errors={[nameError]} />
            </Field>

            <Field data-invalid={!!descriptionError || undefined}>
              <FieldLabel htmlFor="data-source-group-description">
                Description
              </FieldLabel>
              <Textarea
                id="data-source-group-description"
                placeholder="Facebook pages and websites we track for competitor activity"
                aria-invalid={!!descriptionError}
                disabled={isSubmitting}
                rows={3}
                {...form.register("description")}
              />
              <FieldError errors={[descriptionError]} />
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
                  {mode === "create" ? "Creating…" : "Saving…"}
                </>
              ) : mode === "create" ? (
                "Create group"
              ) : (
                "Save group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
