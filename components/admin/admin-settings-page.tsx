"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import type { z } from "zod";

import { FormFieldNumberList } from "@/components/forms/form-field-number-list";
import { FormFieldText } from "@/components/forms/form-field-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { isSettingKey, SETTINGS } from "@/lib/settings/registry";
import type {
  AdminSettingGroup,
  ListSettingsResult,
  SettingDefinition,
  SettingField,
} from "@/lib/settings/types";

import { formatDateTime } from "./admin-format";
import { AdminQueryState } from "./admin-query-state";
import { adminQueryKeys } from "./admin-query-keys";
import { AdminSection } from "./admin-section";
import { fetchAdminJson } from "./fetch-admin-json";
import { sendAdminJson } from "./send-admin-json";

type GroupValues = Record<string, unknown>;

function getPath(value: GroupValues, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, key) => (node as GroupValues | undefined)?.[key], value);
}

function formatFieldValue(value: unknown, field: SettingField): string {
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return field.unit ? `${text} ${field.unit}` : text;
}

function SettingFieldInput({
  form,
  field,
  defaultValue,
}: {
  form: ReturnType<typeof useForm<GroupValues>>;
  field: SettingField;
  defaultValue: GroupValues;
}) {
  const description = [field.description, `Default: ${formatFieldValue(getPath(defaultValue, field.path), field)}.`]
    .filter(Boolean)
    .join(" ");
  const label = field.unit ? `${field.label} (${field.unit})` : field.label;

  return field.kind === "number-list" ? (
    <FormFieldNumberList control={form.control} name={field.path} label={label} description={description} />
  ) : (
    <FormFieldText
      control={form.control}
      name={field.path}
      label={label}
      type="number"
      description={description}
    />
  );
}

function SettingGroupForm({
  group,
  definition,
}: {
  group: AdminSettingGroup;
  definition: SettingDefinition;
}) {
  const queryClient = useQueryClient();
  const form = useForm<GroupValues>({
    resolver: zodResolver(definition.schema as z.ZodType<GroupValues, GroupValues>) as Resolver<GroupValues>,
    defaultValues: group.value,
  });

  const onDone = async (title: string) => {
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    toast.add({ title, type: "success" });
  };
  const onError = (error: Error) => toast.add({ title: error.message, type: "error" });

  const save = useMutation({
    mutationFn: (value: GroupValues) =>
      sendAdminJson(`/api/admin/settings/${group.key}`, "PUT", { value }),
    onSuccess: () => onDone(`${definition.label} saved.`),
    onError,
  });
  const reset = useMutation({
    mutationFn: () => sendAdminJson(`/api/admin/settings/${group.key}`, "DELETE"),
    onSuccess: () => onDone(`${definition.label} back to defaults.`),
    onError,
  });
  const busy = save.isPending || reset.isPending;

  return (
    <form
      noValidate
      className="max-w-2xl space-y-6"
      onSubmit={form.handleSubmit((value) => save.mutate(value))}
    >
      <FieldGroup>
        {definition.fields.map((field) => (
          <SettingFieldInput
            key={field.path}
            form={form}
            field={field}
            defaultValue={group.defaultValue}
          />
        ))}
      </FieldGroup>
      {form.formState.errors.root ? (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {save.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
          Save
        </Button>
        {!group.isDefault ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => reset.mutate()}>
            {reset.isPending ? <Loader2Icon className="animate-spin" data-icon="inline-start" /> : null}
            Reset to defaults
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function SettingGroupSection({ group }: { group: AdminSettingGroup }) {
  if (!isSettingKey(group.key)) return null;
  const definition = SETTINGS[group.key] as unknown as SettingDefinition;

  const changed = group.updatedAt
    ? `Changed ${formatDateTime(group.updatedAt)}${
        group.updatedBy ? ` by ${group.updatedBy.displayName ?? group.updatedBy.email}` : ""
      }.`
    : null;

  return (
    <AdminSection
      title={definition.label}
      description={
        <>
          {definition.description}
          {changed && !group.isDefault ? <span className="mt-1 block">{changed}</span> : null}
        </>
      }
      actions={
        <Badge variant={group.isDefault ? "secondary" : "default"}>
          {group.isDefault ? "Default" : "Custom"}
        </Badge>
      }
    >
      <dl className="mb-4 grid max-w-2xl grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {definition.fields.map((field) => (
          <div key={field.path} className="contents">
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="tabular-nums">{formatFieldValue(getPath(group.value, field.path), field)}</dd>
          </div>
        ))}
      </dl>
      <SettingGroupForm
        key={`${group.key}:${group.updatedAt ?? "default"}`}
        group={group}
        definition={definition}
      />
    </AdminSection>
  );
}

/** App-wide settings: values in use, defaults and an edit form per group. */
export function AdminSettingsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: adminQueryKeys.settings(),
    queryFn: () => fetchAdminJson<ListSettingsResult>("/api/admin/settings"),
  });

  if (!data) return <AdminQueryState isPending={isPending} error={error} />;

  return (
    <>
      {data.items.map((group) => (
        <SettingGroupSection key={group.key} group={group} />
      ))}
    </>
  );
}
