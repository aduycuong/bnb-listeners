"use client";

import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldTags } from "@/components/forms/form-field-tags";
import { Badge } from "@/components/ui/badge";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ALERT_TEMPLATES,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  REPORT_SCHEDULE_LABELS,
  REPORT_SCHEDULES,
} from "@/lib/projects/alert-templates";
import type { AvailableProjectCase } from "@/lib/projects/project-cases";
import type {
  CreateProjectWithConfigBody,
  CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import { cn } from "@/lib/utils";

type ProjectForm = UseFormReturn<
  CreateProjectWithConfigInput,
  unknown,
  CreateProjectWithConfigBody
>;

/** Alert rules suggested for the case, delivery channels and the AI report schedule. */
export function ProjectAlertsFields({
  form,
  projectCase,
}: {
  form: ProjectForm;
  projectCase: AvailableProjectCase;
}) {
  const { fields } = useFieldArray({ control: form.control, name: "alerts.rules" });
  const templates = new Map(ALERT_TEMPLATES[projectCase].map((rule) => [rule.key, rule]));
  const rules = useWatch({ control: form.control, name: "alerts.rules" });
  const rootError = form.formState.errors.alerts?.root?.message;

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-xl bg-muted px-3 py-2 text-[13px]">
        Cảnh báo và báo cáo được lưu ngay, bắt đầu chạy khi hệ thống có dữ liệu phân tích. Email
        được hỗ trợ trước, các kênh khác sau.
      </p>

      <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
        {fields.map((field, index) => {
          const template = templates.get(field.key);
          if (!template) return null;
          const enabled = rules?.[index]?.enabled ?? false;
          return (
            <div key={field.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <Controller
                control={form.control}
                name={`alerts.rules.${index}.enabled`}
                render={({ field: enabledField }) => (
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={enabledField.value}
                      onChange={(event) => enabledField.onChange(event.target.checked)}
                    />
                    {template.label}
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name={`alerts.rules.${index}.threshold`}
                render={({ field: thresholdField, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-28"
                        disabled={!enabled}
                        aria-label={`Ngưỡng: ${template.label}`}
                        aria-invalid={fieldState.invalid}
                        value={thresholdField.value ?? ""}
                        onBlur={thresholdField.onBlur}
                        onChange={(event) =>
                          thresholdField.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value),
                          )
                        }
                      />
                      <span className="w-44 text-xs text-muted-foreground">{template.unit}</span>
                    </div>
                    <FieldError errors={[fieldState.error]} />
                  </div>
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Controller
          control={form.control}
          name="alerts.channels"
          render={({ field, fieldState }) => {
            const values: string[] = field.value ?? [];
            return (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>Gửi cảnh báo qua</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_CHANNELS.map((channel) => {
                    const checked = values.includes(channel);
                    return (
                      <label
                        key={channel}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[13px]",
                          checked ? "border-primary bg-primary/10" : "border-border",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked
                                ? values.filter((item) => item !== channel)
                                : [...values, channel],
                            )
                          }
                        />
                        {NOTIFICATION_CHANNEL_LABELS[channel]}
                        {channel !== "email" ? <Badge variant="outline">sau</Badge> : null}
                      </label>
                    );
                  })}
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            );
          }}
        />
        <FormFieldTags
          control={form.control}
          name="alerts.recipients"
          label="Email nhận cảnh báo và báo cáo"
          placeholder="VD: marketing@congty.vn"
        />
        <FormFieldSelect
          control={form.control}
          name="alerts.reportSchedule"
          label="Báo cáo AI định kỳ"
          options={REPORT_SCHEDULES.map((value) => ({
            value,
            label: REPORT_SCHEDULE_LABELS[value],
          }))}
        />
      </div>
      {rootError ? <p className="text-xs text-destructive">{rootError}</p> : null}
    </div>
  );
}
