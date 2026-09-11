"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { mergeTermsRequest } from "@/components/terms/merge-terms-request";
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
import { mergeTermsNewTargetSchema } from "@/lib/terms/schema";
import { TERM_MERGE_MAX_SOURCES } from "@/lib/terms/term-config";

const MAX_LISTED_NAMES = 5;

type TermMergeItem = {
  id: string;
  name: string;
};

const mergeFormSchema = z.discriminatedUnion("targetMode", [
  z.object({
    targetMode: z.literal("existing"),
    targetId: z.uuid({ error: "Choose a target term." }),
  }),
  z.object({
    targetMode: z.literal("new"),
    newTerm: mergeTermsNewTargetSchema,
  }),
]);

type MergeFormValues = z.infer<typeof mergeFormSchema>;

type TermMergeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  terms: TermMergeItem[];
  onMerged: (result: {
    targetId: string;
    deletedIds: string[];
  }) => Promise<void>;
};

function buildDefaultValues(
  terms: TermMergeItem[],
): MergeFormValues {
  return {
    targetMode: "existing",
    targetId: terms[0]?.id ?? "",
  };
}

export function TermMergeDialog({
  open,
  onOpenChange,
  workspaceId,
  terms,
  onMerged,
}: TermMergeDialogProps) {
  const [merging, setMerging] = useState(false);
  const form = useForm<MergeFormValues>({
    resolver: zodResolver(mergeFormSchema),
    defaultValues: buildDefaultValues(terms),
  });

  const targetMode = form.watch("targetMode");
  const formErrors = form.formState.errors;
  const existingTargetError =
    targetMode === "existing" && "targetId" in formErrors
      ? formErrors.targetId
      : undefined;
  const newTermNameError =
    targetMode === "new" && "newTerm" in formErrors
      ? formErrors.newTerm?.name
      : undefined;
  const newTermDescriptionError =
    targetMode === "new" && "newTerm" in formErrors
      ? formErrors.newTerm?.description
      : undefined;

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(terms));
    }
  }, [open, terms, form]);

  const listedTerms = terms.slice(0, MAX_LISTED_NAMES);
  const remainingCount = Math.max(0, terms.length - MAX_LISTED_NAMES);

  const termSelectItems = useMemo(
    () => terms.map((term) => ({ label: term.name, value: term.id })),
    [terms],
  );

  const selectedTargetId =
    targetMode === "existing" ? form.watch("targetId") : undefined;

  const sourcePreview = useMemo(() => {
    const sourceTerms = selectedTargetId
      ? terms.filter((term) => term.id !== selectedTargetId)
      : terms;

    return {
      count: sourceTerms.length,
      names: sourceTerms.map((term) => term.name),
    };
  }, [selectedTargetId, terms]);

  async function handleSubmit(values: MergeFormValues) {
    if (terms.length < 2) {
      return;
    }

    const sourceIds =
      values.targetMode === "existing"
        ? terms
            .filter((term) => term.id !== values.targetId)
            .map((term) => term.id)
        : terms.map((term) => term.id);

    if (sourceIds.length === 0) {
      toast.add({
        title: "Choose a different target term.",
        type: "error",
      });
      return;
    }

    if (sourceIds.length > TERM_MERGE_MAX_SOURCES) {
      toast.add({
        title: `Cannot merge more than ${TERM_MERGE_MAX_SOURCES} source terms at once.`,
        type: "error",
      });
      return;
    }

    setMerging(true);

    try {
      const result = await mergeTermsRequest(
        workspaceId,
        values.targetMode === "existing"
          ? { sourceIds, targetId: values.targetId }
          : {
              sourceIds,
              newTerm: {
                name: values.newTerm.name.trim(),
                description: values.newTerm.description?.trim() || undefined,
              },
            },
      );

      if (!result.ok || !result.data) {
        toast.add({
          title: result.message ?? "Could not merge terms.",
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
          <DialogTitle>Merge terms</DialogTitle>
          <DialogDescription>
            Move document assignments from the selected terms into one target
            term, then remove the source terms.
          </DialogDescription>
        </DialogHeader>

        {terms.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {listedTerms.map((term) => (
              <li key={term.id}>{term.name}</li>
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
                      targetId: terms[0]?.id ?? "",
                    });
                    return;
                  }

                  form.reset({
                    targetMode: "new",
                    newTerm: { name: "", description: "" },
                  });
                }}
                className="gap-3"
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="existing" id="merge-target-existing" />
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="merge-target-existing">
                      Merge into one of the selected terms
                    </Label>
                    {targetMode === "existing" ? (
                      <Select
                        items={termSelectItems}
                        value={selectedTargetId}
                        onValueChange={(value) =>
                          form.setValue("targetId", value ?? "", {
                            shouldValidate: true,
                          })
                        }
                        disabled={merging}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose target term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map((term) => (
                            <SelectItem key={term.id} value={term.id}>
                              {term.name}
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
                    <Label htmlFor="merge-target-new">Create a new term</Label>
                    {targetMode === "new" ? (
                      <>
                        <Input
                          placeholder="Term name"
                          disabled={merging}
                          {...form.register("newTerm.name")}
                        />
                        {newTermNameError ? (
                          <FieldError errors={[newTermNameError]} />
                        ) : null}
                        <Textarea
                          placeholder="Description (optional)"
                          disabled={merging}
                          rows={3}
                          {...form.register("newTerm.description")}
                        />
                        {newTermDescriptionError ? (
                          <FieldError errors={[newTermDescriptionError]} />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </RadioGroup>
            </Field>

            <FieldDescription>
              {sourcePreview.count > 0
                ? `${sourcePreview.count} term${sourcePreview.count === 1 ? "" : "s"} will be removed after merging: ${sourcePreview.names.join(", ")}.`
                : "All selected terms will be removed after merging into the new term."}
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
            <Button type="submit" disabled={merging || terms.length < 2}>
              {merging ? (
                <>
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                  Merging…
                </>
              ) : (
                "Merge terms"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
