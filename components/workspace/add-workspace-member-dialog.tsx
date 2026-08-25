"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { toast } from "@/components/ui/toast";
import {
  addWorkspaceMemberFormSchema,
  type AddWorkspaceMemberFormValues,
} from "@/lib/workspaces/schema";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

const PERMISSION_OPTIONS = [
  {
    value: "read",
    label: "Read",
    description: "View workspace content.",
  },
  {
    value: "edit",
    label: "Edit",
    description: "Modify workspace content.",
  },
  {
    value: "owner",
    label: "Owner",
    description: "Full control, including member management.",
  },
] as const;

type AddWorkspaceMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onAdded: () => Promise<void>;
};

export function AddWorkspaceMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  onAdded,
}: AddWorkspaceMemberDialogProps) {
  const form = useForm<AddWorkspaceMemberFormValues>({
    resolver: zodResolver(addWorkspaceMemberFormSchema),
    defaultValues: { email: "", permission: "read" },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  async function onSubmit(values: AddWorkspaceMemberFormValues) {
    form.clearErrors("email");

    const res = await workspaceFetch(workspaceId, "/api/workspace-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json()) as {
      message?: string;
      error?: string;
    };

    if (res.ok) {
      toast.add({
        title: data.message ?? "Member added.",
        type: "success",
      });
      onOpenChange(false);
      await onAdded();
      return;
    }

    if (data.error === "ERR_USER_NOT_FOUND") {
      form.setError("email", {
        message:
          data.message ??
          "No account found with that email. They need to sign up before they can be added.",
      });
      return;
    }

    toast.add({
      title: data.message ?? data.error ?? "Could not add member.",
      type: "error",
    });
  }

  const isSubmitting = form.formState.isSubmitting;
  const emailError = form.formState.errors.email;
  const permissionError = form.formState.errors.permission;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSubmitting}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Invite someone by email. They must already have an account.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field data-invalid={!!emailError || undefined}>
              <FieldLabel htmlFor="member-email">Email</FieldLabel>
              <Input
                id="member-email"
                type="email"
                autoComplete="email"
                placeholder="colleague@example.com"
                aria-invalid={!!emailError}
                disabled={isSubmitting}
                {...form.register("email", {
                  onChange: () => form.clearErrors("email"),
                })}
              />
              <FieldError errors={[emailError]} />
            </Field>
            <Field data-invalid={!!permissionError || undefined}>
              <Controller
                name="permission"
                control={form.control}
                render={({ field }) => (
                  <FieldSet data-slot="radio-group">
                    <FieldLegend variant="label">Permission</FieldLegend>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      {PERMISSION_OPTIONS.map((option) => (
                        <Field
                          key={option.value}
                          orientation="horizontal"
                          data-invalid={!!permissionError || undefined}
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`member-permission-${option.value}`}
                            aria-invalid={!!permissionError}
                          />
                          <FieldContent>
                            <FieldLabel
                              htmlFor={`member-permission-${option.value}`}
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
              <FieldError errors={[permissionError]} />
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
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                  Adding…
                </>
              ) : (
                "Add member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
