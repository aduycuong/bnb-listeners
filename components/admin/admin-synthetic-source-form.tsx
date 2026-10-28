"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Controller, useForm, type Control } from "react-hook-form";

import { FormFieldCron } from "@/components/forms/form-field-cron";
import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
import { FormFieldTextarea } from "@/components/forms/form-field-textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { SYNTHETIC_CONFIG } from "@/lib/personas/config";
import {
  syntheticSourceFormSchema,
  type SyntheticSourceConfig,
  type SyntheticSourceFormValues,
} from "@/lib/personas/schema";
import type { PanelRow } from "@/lib/personas/types";

import { adminQueryKeys } from "./admin-query-keys";
import { fetchAdminJson } from "./fetch-admin-json";

export const SYNTHETIC_SOURCE_DEFAULTS: SyntheticSourceFormValues = {
  name: "",
  enabled: true,
  panelId: "",
  topics: "",
  postsPerRun: 5,
  minComments: 0,
  maxComments: 12,
  briefsPerRun: 3,
  cronConfig: { cron: "0 * * * *", timezone: "Asia/Ho_Chi_Minh" },
  collectNow: true,
};

/** Form values of a saved source; a synthetic source without a config starts from the defaults. */
export function toSyntheticSourceFormValues(
  name: string | null,
  config: SyntheticSourceConfig | null,
): SyntheticSourceFormValues {
  if (!config) return { ...SYNTHETIC_SOURCE_DEFAULTS, name: name ?? "", enabled: false };

  return {
    name: name ?? "",
    enabled: config.enabled,
    panelId: config.panelId,
    topics: config.topics.join("\n"),
    postsPerRun: config.postsPerRun,
    minComments: config.commentsPerPost[0],
    maxComments: config.commentsPerPost[1],
    briefsPerRun: config.briefsPerRun,
    cronConfig: config.cronConfig,
    collectNow: false,
  };
}

type AdminSyntheticSourceFormProps = {
  defaultValues: SyntheticSourceFormValues;
  /** Create: shows "start the first run now". */
  mode: "create" | "edit";
  onSubmit: (values: SyntheticSourceFormValues) => void;
  /** Submit and cancel buttons, placed by the caller (dialog footer or page). */
  actions: ReactNode;
};

/** Name, panel, topics, run size and cron of a synthetic source that writes on its own. */
export function AdminSyntheticSourceForm({
  defaultValues,
  mode,
  onSubmit,
  actions,
}: AdminSyntheticSourceFormProps) {
  const panels = useQuery({
    queryKey: adminQueryKeys.panels(),
    queryFn: () => fetchAdminJson<{ items: PanelRow[] }>("/api/admin/persona-panels"),
  });
  const panelOptions = (panels.data?.items ?? []).map((panel) => ({
    value: panel.id,
    label: `${panel.name} (${panel.memberCount})`,
  }));

  const form = useForm<SyntheticSourceFormValues>({
    resolver: zodResolver(syntheticSourceFormSchema),
    defaultValues,
  });

  return (
    <form noValidate className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <FormFieldText
          control={form.control}
          name="name"
          label="Name"
          placeholder="Review BĐS giả"
          description={
            mode === "create"
              ? "A fake Facebook group. A name already taken returns that source unchanged."
              : "Display name; the source id keeps the original name."
          }
        />
        <FormFieldSelect
          control={form.control}
          name="panelId"
          label="Panel"
          options={panelOptions}
          placeholder={panels.isPending ? "Loading…" : "Pick a panel"}
          description="Who writes, by persona weight. Create one under Panels."
        />
        <FormFieldTextarea
          control={form.control}
          name="topics"
          label="Topics"
          rows={4}
          placeholder={"Tiến độ bàn giao dự án X\nGiá thứ cấp khu Y\nPháp lý sổ hồng"}
          description="One per line. Each run the model writes briefs from these, continuing the source's recent briefs."
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormFieldText control={form.control} name="postsPerRun" label="Posts / run" type="number" />
          <FormFieldText control={form.control} name="briefsPerRun" label="Briefs / run" type="number" />
          <FormFieldText control={form.control} name="minComments" label="Min comments" type="number" />
          <FormFieldText control={form.control} name="maxComments" label="Max comments" type="number" />
        </div>
        <p className="-mt-3 text-sm text-muted-foreground">
          At most {SYNTHETIC_CONFIG.maxThreadsPerRun} posts and {SYNTHETIC_CONFIG.maxBriefsPerRun}{" "}
          briefs per run. Posts are spread from the previous run to now.
        </p>
        <FormFieldCron
          control={form.control}
          name="cronConfig"
          label="Schedule"
          placeholder="0 * * * *"
          description="When a run starts. A run still in progress makes the next tick skip."
        />
        <SwitchField
          control={form.control}
          name="enabled"
          label="Run on schedule"
          description="Off removes the schedule; you can still start a run by hand."
        />
        {mode === "create" ? (
          <SwitchField
            control={form.control}
            name="collectNow"
            label="Start the first run now"
            description="Otherwise the first run waits for the schedule."
          />
        ) : null}
      </FieldGroup>
      {actions}
    </form>
  );
}

function SwitchField({
  control,
  name,
  label,
  description,
}: {
  control: Control<SyntheticSourceFormValues>;
  name: "enabled" | "collectNow";
  label: string;
  description: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal">
          <Switch id={field.name} checked={field.value} onCheckedChange={field.onChange} />
          <FieldContent>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <FieldDescription>{description}</FieldDescription>
          </FieldContent>
        </Field>
      )}
    />
  );
}
