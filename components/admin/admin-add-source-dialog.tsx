"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { createSourceBodySchema, type CreateSourceBody } from "@/lib/connectors/schema";
import type { CreateSourceResult } from "@/lib/connectors/types";

import { sendAdminJson } from "./send-admin-json";

const KIND_OPTIONS = [
  { value: "facebook", label: "Facebook group or page" },
  { value: "tiktok-channel", label: "TikTok channel" },
  { value: "tiktok-search", label: "TikTok keyword search" },
];

const URL_HINTS: Record<string, { placeholder: string; description: string }> = {
  facebook: {
    placeholder: "https://www.facebook.com/groups/…",
    description: "A group or page URL; the same group or page is never added twice.",
  },
  "tiktok-channel": {
    placeholder: "https://www.tiktok.com/@username",
    description: "Resolving the channel uses one TikHub request.",
  },
};

const DEFAULT_VALUES: CreateSourceBody = {
  kind: "facebook",
  url: "",
  keyword: "",
  region: "",
  name: "",
  collectNow: true,
};

/** "Add source" button and its dialog on the sources page. */
export function AdminAddSourceDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CreateSourceBody>({
    resolver: zodResolver(createSourceBodySchema),
    defaultValues: DEFAULT_VALUES,
  });
  const kind = useWatch({ control: form.control, name: "kind" });

  const create = useMutation({
    mutationFn: (values: CreateSourceBody) =>
      sendAdminJson<CreateSourceResult>("/api/admin/sources", "POST", values),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      if (!result.created) {
        toast.add({ title: "This source already exists.", type: "info" });
      } else if (result.collectError) {
        toast.add({
          title: "Source added, but the first run did not start.",
          description: result.collectError,
          type: "warning",
        });
      } else {
        toast.add({
          title: result.collectRunId ? "Source added; first run started." : "Source added.",
          type: "success",
        });
      }
      setOpen(false);
      form.reset(DEFAULT_VALUES);
      router.push(`/admin/sources/${result.sourceId}`);
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  const urlHint = URL_HINTS[kind];

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        Add source
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!create.isPending) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>Add source</DialogTitle>
            <DialogDescription>
              Projects can follow the source once it is added. Tier and record limits are set on
              its page.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-6"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <FieldGroup>
              <FormFieldSelect control={form.control} name="kind" label="Type" options={KIND_OPTIONS} />
              {urlHint ? (
                <>
                  <FormFieldText
                    control={form.control}
                    name="url"
                    label="URL"
                    placeholder={urlHint.placeholder}
                    description={urlHint.description}
                  />
                  <FormFieldText
                    control={form.control}
                    name="name"
                    label="Name"
                    placeholder="Optional"
                    description="Empty: filled in from the first run (TikTok: the channel's nickname)."
                  />
                </>
              ) : (
                <>
                  <FormFieldText
                    control={form.control}
                    name="keyword"
                    label="Keyword"
                    description="Spacing and case do not matter; the same keyword and region is one source."
                  />
                  <FormFieldText
                    control={form.control}
                    name="region"
                    label="Region"
                    placeholder="VN"
                    description="Two-letter country code. Empty: the configured search region."
                  />
                </>
              )}
              <Controller
                control={form.control}
                name="collectNow"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Switch
                      id={field.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={field.name}>Start the first run now</FieldLabel>
                      <FieldDescription>
                        Scheduled runs only start after a source has been collected once. The
                        first run is billed by the provider like any other.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )}
              />
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={create.isPending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : null}
                Add source
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
