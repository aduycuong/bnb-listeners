"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { mergeTopicsRequest } from "@/components/topics/merge-topics-request";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { mergeTopicsNewTargetSchema } from "@/lib/topics/schema";
import { TOPIC_MERGE_MAX_SOURCES } from "@/lib/topics/topic-config";

const MAX_LISTED_NAMES = 5;

type TopicMergeItem = {
  id: string;
  name: string;
};

const mergeFormSchema = z.discriminatedUnion("targetMode", [
  z.object({
    targetMode: z.literal("existing"),
    targetId: z.uuid({ error: "Choose a target topic." }),
  }),
  z.object({
    targetMode: z.literal("new"),
    newTopic: mergeTopicsNewTargetSchema,
  }),
]);

type MergeFormValues = z.infer<typeof mergeFormSchema>;

type TopicMergeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  topics: TopicMergeItem[];
  onMerged: (result: {
    targetId: string;
    deletedIds: string[];
  }) => Promise<void>;
};

function buildDefaultValues(
  topics: TopicMergeItem[],
): MergeFormValues {
  return {
    targetMode: "existing",
    targetId: topics[0]?.id ?? "",
  };
}

export function TopicMergeDialog({
  open,
  onOpenChange,
  workspaceId,
  topics,
  onMerged,
}: TopicMergeDialogProps) {
  const [merging, setMerging] = useState(false);
  const form = useForm<MergeFormValues>({
    resolver: zodResolver(mergeFormSchema),
    defaultValues: buildDefaultValues(topics),
  });

  const targetMode = form.watch("targetMode");
  const formErrors = form.formState.errors;
  const existingTargetError =
    targetMode === "existing" && "targetId" in formErrors
      ? formErrors.targetId
      : undefined;
  const newTopicNameError =
    targetMode === "new" && "newTopic" in formErrors
      ? formErrors.newTopic?.name
      : undefined;
  const newTopicDescriptionError =
    targetMode === "new" && "newTopic" in formErrors
      ? formErrors.newTopic?.description
      : undefined;

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(topics));
    }
  }, [open, topics, form]);

  const listedTopics = topics.slice(0, MAX_LISTED_NAMES);
  const remainingCount = Math.max(0, topics.length - MAX_LISTED_NAMES);

  const topicSelectItems = useMemo(
    () => topics.map((topic) => ({ label: topic.name, value: topic.id })),
    [topics],
  );

  const selectedTargetId =
    targetMode === "existing" ? form.watch("targetId") : undefined;

  const sourcePreview = useMemo(() => {
    const sourceTopics = selectedTargetId
      ? topics.filter((topic) => topic.id !== selectedTargetId)
      : topics;

    return {
      count: sourceTopics.length,
      names: sourceTopics.map((topic) => topic.name),
    };
  }, [selectedTargetId, topics]);

  async function handleSubmit(values: MergeFormValues) {
    if (topics.length < 2) {
      return;
    }

    const sourceIds =
      values.targetMode === "existing"
        ? topics
            .filter((topic) => topic.id !== values.targetId)
            .map((topic) => topic.id)
        : topics.map((topic) => topic.id);

    if (sourceIds.length === 0) {
      toast.add({
        title: "Choose a different target topic.",
        type: "error",
      });
      return;
    }

    if (sourceIds.length > TOPIC_MERGE_MAX_SOURCES) {
      toast.add({
        title: `Cannot merge more than ${TOPIC_MERGE_MAX_SOURCES} source topics at once.`,
        type: "error",
      });
      return;
    }

    setMerging(true);

    try {
      const result = await mergeTopicsRequest(
        workspaceId,
        values.targetMode === "existing"
          ? { sourceIds, targetId: values.targetId }
          : {
              sourceIds,
              newTopic: {
                name: values.newTopic.name.trim(),
                description: values.newTopic.description?.trim() || undefined,
              },
            },
      );

      if (!result.ok || !result.data) {
        toast.add({
          title: result.message ?? "Could not merge topics.",
          type: "error",
        });
        return;
      }

      const { targetId, deletedIds, failures, message } = result.data;

      await onMerged({ targetId, deletedIds });

      if (failures.length === 0) {
        toast.add({
          title: message,
          type: "success",
        });
        onOpenChange(false);
        return;
      }

      toast.add({
        title: message,
        description: failures
          .slice(0, 3)
          .map((failure) => `${failure.id}: ${failure.message}`)
          .join(" "),
        type: "warning",
      });
      onOpenChange(false);
    } finally {
      setMerging(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!merging) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge topics</DialogTitle>
          <DialogDescription>
            Move document assignments from the selected topics into one target
            topic, then remove the source topics.
          </DialogDescription>
        </DialogHeader>

        {topics.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {listedTopics.map((topic) => (
              <li key={topic.id}>{topic.name}</li>
            ))}
            {remainingCount > 0 ? <li>and {remainingCount} more</li> : null}
          </ul>
        ) : null}

        <form
          className="space-y-5"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Target</FieldLabel>
              <RadioGroup
                value={targetMode}
                onValueChange={(value) => {
                  if (value === "existing") {
                    form.reset({
                      targetMode: "existing",
                      targetId: topics[0]?.id ?? "",
                    });
                    return;
                  }

                  form.reset({
                    targetMode: "new",
                    newTopic: { name: "", description: "" },
                  });
                }}
                className="gap-3"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="existing" id="merge-target-existing" />
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="merge-target-existing">
                      Merge into one of the selected topics
                    </Label>
                    {targetMode === "existing" ? (
                      <Select
                        items={topicSelectItems}
                        value={selectedTargetId}
                        onValueChange={(value) =>
                          form.setValue("targetId", value ?? "", {
                            shouldValidate: true,
                          })
                        }
                        disabled={merging}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose target topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((topic) => (
                            <SelectItem key={topic.id} value={topic.id}>
                              {topic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {existingTargetError ? (
                      <FieldError errors={[existingTargetError]} />
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <RadioGroupItem value="new" id="merge-target-new" />
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="merge-target-new">Create a new topic</Label>
                    {targetMode === "new" ? (
                      <>
                        <Input
                          placeholder="Topic name"
                          disabled={merging}
                          {...form.register("newTopic.name")}
                        />
                        {newTopicNameError ? (
                          <FieldError errors={[newTopicNameError]} />
                        ) : null}
                        <Textarea
                          placeholder="Description (optional)"
                          disabled={merging}
                          rows={3}
                          {...form.register("newTopic.description")}
                        />
                        {newTopicDescriptionError ? (
                          <FieldError errors={[newTopicDescriptionError]} />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </RadioGroup>
            </Field>

            <FieldDescription>
              {sourcePreview.count > 0
                ? `${sourcePreview.count} topic${sourcePreview.count === 1 ? "" : "s"} will be removed after merging: ${sourcePreview.names.join(", ")}.`
                : "All selected topics will be removed after merging into the new topic."}
            </FieldDescription>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={merging}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={merging || topics.length < 2}>
              {merging ? (
                <>
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  Merging…
                </>
              ) : (
                "Merge topics"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
