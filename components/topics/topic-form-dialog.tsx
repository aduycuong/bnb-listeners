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
import { topicFormSchema } from "@/lib/topics/schema";
import { TOPIC_CONFIG } from "@/lib/topics/topic-config";
import type { TopicFormValues } from "@/lib/topics/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type TopicFormTarget = {
  id: string;
  name: string;
  description: string | null;
};

function topicToFormValues(topic?: TopicFormTarget): TopicFormValues {
  return {
    name: topic?.name ?? "",
    description: topic?.description ?? "",
  };
}

type TopicFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  topic?: TopicFormTarget;
  onSaved: () => Promise<void>;
};

export function TopicFormDialog({
  open,
  onOpenChange,
  workspaceId,
  topic,
  onSaved,
}: TopicFormDialogProps) {
  const mode = topic ? "edit" : "create";
  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: topicToFormValues(topic),
  });

  useEffect(() => {
    if (open) {
      form.reset(topicToFormValues(topic));
    }
  }, [open, topic, form]);

  async function onSubmit(values: TopicFormValues) {
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

    const url = mode === "create" ? "/api/topics" : `/api/topics/${topic?.id}`;
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
            ? "Could not create topic."
            : "Could not update topic."),
        type: "error",
      });
      return;
    }

    toast.add({
      title: mode === "create" ? "Topic created." : "Topic updated.",
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
                ? TOPIC_CONFIG.formCreateTitle
                : TOPIC_CONFIG.formEditTitle}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? TOPIC_CONFIG.formCreateDescription
                : TOPIC_CONFIG.formEditDescription}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!nameError || undefined}>
              <FieldLabel htmlFor="topic-name">Name</FieldLabel>
              <Input
                id="topic-name"
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
              <FieldLabel htmlFor="topic-description">Description</FieldLabel>
              <Textarea
                id="topic-description"
                placeholder="What this topic covers"
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
                "Create topic"
              ) : (
                "Save topic"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
