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
import { termGroupFormSchema } from "@/lib/term-groups/schema";
import { TERM_GROUP_CONFIG } from "@/lib/term-groups/term-group-config";
import type { TermGroupFormValues, TermGroupListItem } from "@/lib/term-groups/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermGroupFormTarget = Pick<TermGroupListItem, "id" | "name" | "description">;

function groupToFormValues(group?: TermGroupFormTarget): TermGroupFormValues {
  return {
    name: group?.name ?? "",
    description: group?.description ?? "",
  };
}

type TermGroupFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  group?: TermGroupFormTarget;
  onSaved: () => Promise<void>;
};

export function TermGroupFormDialog({
  open,
  onOpenChange,
  workspaceId,
  group,
  onSaved,
}: TermGroupFormDialogProps) {
  const mode = group ? "edit" : "create";
  const form = useForm<TermGroupFormValues>({
    resolver: zodResolver(termGroupFormSchema),
    defaultValues: groupToFormValues(group),
  });

  useEffect(() => {
    if (open) {
      form.reset(groupToFormValues(group));
    }
  }, [open, group, form]);

  async function onSubmit(values: TermGroupFormValues) {
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
      mode === "create" ? "/api/term-groups" : `/api/term-groups/${group?.id}`;
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
                ? TERM_GROUP_CONFIG.formCreateTitle
                : TERM_GROUP_CONFIG.formEditTitle}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? TERM_GROUP_CONFIG.formCreateDescription
                : TERM_GROUP_CONFIG.formEditDescription}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!nameError || undefined}>
              <FieldLabel htmlFor="term-group-name">Name</FieldLabel>
              <Input
                id="term-group-name"
                placeholder="Dự án"
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
              <FieldLabel htmlFor="term-group-description">
                Description
              </FieldLabel>
              <Textarea
                id="term-group-description"
                placeholder="Terms that represent specific real-estate projects"
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
