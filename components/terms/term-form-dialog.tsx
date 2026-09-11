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
import { termFormSchema } from "@/lib/terms/schema";
import { TERM_CONFIG } from "@/lib/terms/term-config";
import type { TermFormValues } from "@/lib/terms/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TermFormTarget = {
  id: string;
  name: string;
  description: string | null;
};

function termToFormValues(term?: TermFormTarget): TermFormValues {
  return {
    name: term?.name ?? "",
    description: term?.description ?? "",
  };
}

type TermFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  term?: TermFormTarget;
  onSaved: () => Promise<void>;
};

export function TermFormDialog({
  open,
  onOpenChange,
  workspaceId,
  term,
  onSaved,
}: TermFormDialogProps) {
  const mode = term ? "edit" : "create";
  const form = useForm<TermFormValues>({
    resolver: zodResolver(termFormSchema),
    defaultValues: termToFormValues(term),
  });

  useEffect(() => {
    if (open) {
      form.reset(termToFormValues(term));
    }
  }, [open, term, form]);

  async function onSubmit(values: TermFormValues) {
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

    const url = mode === "create" ? "/api/terms" : `/api/terms/${term?.id}`;
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
            ? "Could not create term."
            : "Could not update term."),
        type: "error",
      });
      return;
    }

    toast.add({
      title: mode === "create" ? "Term created." : "Term updated.",
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
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isSubmitting}
      >
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? TERM_CONFIG.formCreateTitle
                : TERM_CONFIG.formEditTitle}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? TERM_CONFIG.formCreateDescription
                : TERM_CONFIG.formEditDescription}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!nameError || undefined}>
              <FieldLabel htmlFor="term-name">Name</FieldLabel>
              <Input
                id="term-name"
                placeholder="Market trends"
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
              <FieldLabel htmlFor="term-description">Description</FieldLabel>
              <Textarea
                id="term-description"
                placeholder="What this term covers"
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
                "Create term"
              ) : (
                "Save term"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
