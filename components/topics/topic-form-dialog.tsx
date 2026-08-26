"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo } from "react";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { topicFormSchema } from "@/lib/topics/schema";
import { TOPIC_CONFIG } from "@/lib/topics/topic-config";
import type { TopicFormValues, TopicListItem } from "@/lib/topics/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

const NONE_PARENT_VALUE = "none";

function collectDescendantIds(
  topics: TopicListItem[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const topic of topics) {
    if (!topic.parentId) {
      continue;
    }

    const siblings = childrenByParent.get(topic.parentId) ?? [];
    siblings.push(topic.id);
    childrenByParent.set(topic.parentId, siblings);
  }

  const ids = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const childId of childrenByParent.get(current) ?? []) {
      if (!ids.has(childId)) {
        ids.add(childId);
        stack.push(childId);
      }
    }
  }

  return ids;
}

function topicToFormValues(topic?: TopicListItem): TopicFormValues {
  return {
    name: topic?.name ?? "",
    description: topic?.description ?? "",
    parentId: topic?.parentId ?? NONE_PARENT_VALUE,
    verified: topic?.verified ?? true,
  };
}

type TopicFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  topics: TopicListItem[];
  topic?: TopicListItem;
  onSaved: () => Promise<void>;
};

export function TopicFormDialog({
  open,
  onOpenChange,
  workspaceId,
  topics,
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

  const parentOptions = useMemo(() => {
    const excluded = new Set<string>();
    if (topic) {
      excluded.add(topic.id);
      for (const id of collectDescendantIds(topics, topic.id)) {
        excluded.add(id);
      }
    }

    return topics.filter((item) => !excluded.has(item.id));
  }, [topic, topics]);

  async function onSubmit(values: TopicFormValues) {
    const parentId =
      values.parentId === NONE_PARENT_VALUE ? null : values.parentId;
    const description = values.description.trim();

    const body =
      mode === "create"
        ? {
            name: values.name.trim(),
            description: description || undefined,
            parentId,
            verified: values.verified,
          }
        : {
            name: values.name.trim(),
            description: description || null,
            parentId,
            verified: values.verified,
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
  const parentError = form.formState.errors.parentId;

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

            <Field data-invalid={!!parentError || undefined}>
              <FieldLabel htmlFor="topic-parent">Parent topic</FieldLabel>
              <Controller
                name="parentId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="topic-parent"
                      className="w-full"
                      aria-invalid={!!parentError}
                    >
                      <SelectValue placeholder="No parent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_PARENT_VALUE}>
                        No parent
                      </SelectItem>
                      {parentOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldDescription>
                Optional. Nest this topic under another one.
              </FieldDescription>
              <FieldError errors={[parentError]} />
            </Field>

            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-1">
                <FieldLabel htmlFor="topic-verified">Verified</FieldLabel>
                <FieldDescription>
                  Mark reviewed topics so they stand out from classifier
                  proposals.
                </FieldDescription>
              </div>
              <Controller
                name="verified"
                control={form.control}
                render={({ field }) => (
                  <Switch
                    id="topic-verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
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
