"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  createSourceBodySchema,
  type CreateSourceBody,
  type NewSourceKind,
} from "@/lib/connectors/schema";
import type { CreateSourceResult } from "@/lib/connectors/types";
import {
  toSyntheticSourceConfig,
  type CreateSyntheticSourceBody,
  type SyntheticSourceFormValues,
} from "@/lib/personas/schema";

import {
  AdminSyntheticSourceForm,
  SYNTHETIC_SOURCE_DEFAULTS,
} from "./admin-synthetic-source-form";
import { sendAdminJson } from "./send-admin-json";

type SourceType = NewSourceKind | "synthetic";

const TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "facebook", label: "Facebook group or page" },
  { value: "tiktok-channel", label: "TikTok channel" },
  { value: "tiktok-search", label: "TikTok keyword search" },
  { value: "synthetic", label: "Synthetic group (written by personas)" },
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

type CreateRequest =
  | { type: "connector"; body: CreateSourceBody }
  | { type: "synthetic"; body: CreateSyntheticSourceBody };

function toCreateSyntheticSourceBody(values: SyntheticSourceFormValues): CreateSyntheticSourceBody {
  return {
    name: values.name,
    config: toSyntheticSourceConfig(values),
    collectNow: values.collectNow,
  };
}

/** "Add source" button and its dialog on the sources page. */
export function AdminAddSourceDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SourceType>("facebook");
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CreateSourceBody>({
    resolver: zodResolver(createSourceBodySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const create = useMutation({
    mutationFn: (request: CreateRequest) =>
      sendAdminJson<CreateSourceResult>(
        request.type === "synthetic" ? "/api/admin/synthetic/sources" : "/api/admin/sources",
        "POST",
        request.body,
      ),
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
      setType("facebook");
      router.push(`/admin/sources/${result.sourceId}`);
    },
    onError: (error: Error) => {
      toast.add({ title: error.message, type: "error" });
    },
  });

  const urlHint = URL_HINTS[type];
  const footer = (
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
        {create.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
        Add source
      </Button>
    </DialogFooter>
  );

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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle>Add source</DialogTitle>
            <DialogDescription>
              {type === "synthetic"
                ? "A fake group whose posts and comments are written by the personas of a panel, on a schedule (origin = synthetic). Projects can follow it like any source."
                : "Projects can follow the source once it is added. Tier and record limits are set on its page."}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="add-source-type">Type</FieldLabel>
            <Select
              items={TYPE_OPTIONS}
              value={type}
              onValueChange={(value) => {
                if (!value) return;
                const next = value as SourceType;
                setType(next);
                if (next !== "synthetic") form.setValue("kind", next);
              }}
            >
              <SelectTrigger id="add-source-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {type === "synthetic" ? (
            <AdminSyntheticSourceForm
              mode="create"
              defaultValues={SYNTHETIC_SOURCE_DEFAULTS}
              onSubmit={(values) =>
                create.mutate({ type: "synthetic", body: toCreateSyntheticSourceBody(values) })
              }
              actions={footer}
            />
          ) : (
            <form
              noValidate
              className="space-y-6"
              onSubmit={form.handleSubmit((values) => create.mutate({ type: "connector", body: values }))}
            >
              <FieldGroup>
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
              {footer}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
