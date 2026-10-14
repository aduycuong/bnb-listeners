"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldTags } from "@/components/forms/form-field-tags";
import { FormFieldText } from "@/components/forms/form-field-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  ALERT_RULE_KIND_DEFS,
  ALERT_WINDOW_LABELS,
  ALERT_WINDOWS,
  MAX_ALERT_RULES,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  REPORT_SCHEDULE_LABELS,
  REPORT_SCHEDULES,
  alertKindsForCase,
  type AlertRuleKindDef,
} from "@/lib/projects/alert-templates";
import { getCaseTemplate } from "@/lib/projects/case-templates";
import type { AvailableProjectCase } from "@/lib/projects/project-cases";
import type {
  CreateProjectWithConfigBody,
  CreateProjectWithConfigInput,
} from "@/lib/projects/schema";
import { toAlertRuleInput } from "@/lib/projects/utils/to-alert-rule-input";
import { cn } from "@/lib/utils";

type ProjectForm = UseFormReturn<
  CreateProjectWithConfigInput,
  unknown,
  CreateProjectWithConfigBody
>;

type ScopeOption = { value: string; label: string; type: string };

/** Scope choices built from the entities and aspects currently in the form. */
function useScopeOptions(form: ProjectForm, projectCase: AvailableProjectCase): ScopeOption[] {
  const entities = useWatch({ control: form.control, name: "entities" }) ?? [];
  const aspects = useWatch({ control: form.control, name: "aspects" }) ?? [];
  const caseVersion = useWatch({ control: form.control, name: "caseVersion" });
  const roles = getCaseTemplate(projectCase, caseVersion).roles;
  const roleLabel = new Map(roles.map((role) => [role.role, role.label]));

  return [
    { value: "project", label: "Toàn project", type: "project" },
    ...roles
      .filter((role) => role.max > 1)
      .map((role) => ({
        value: `each_role:${role.role}`,
        label: `Từng mục: ${role.label.toLowerCase()}`,
        type: "each_role",
      })),
    ...entities.map((entity) => ({
      value: `entity:${entity.id}`,
      label: `${roleLabel.get(entity.role) ?? entity.role}: ${entity.name || "(chưa đặt tên)"}`,
      type: "entity",
    })),
    ...aspects.map((aspect) => ({
      value: `aspect:${aspect.id}`,
      label: `Khía cạnh: ${aspect.name || "(chưa đặt tên)"}`,
      type: "aspect",
    })),
  ];
}

/** Alert rules picked from the kind catalog, delivery channels and the AI report schedule. */
export function ProjectAlertsFields({
  form,
  projectCase,
}: {
  form: ProjectForm;
  projectCase: AvailableProjectCase;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "alerts.rules",
  });
  const scopeOptions = useScopeOptions(form, projectCase);
  const kinds = alertKindsForCase(projectCase);
  const rulesError =
    form.formState.errors.alerts?.rules?.message ??
    form.formState.errors.alerts?.rules?.root?.message;

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-xl bg-muted px-3 py-2 text-[13px]">
        Cảnh báo và báo cáo được lưu ngay, bắt đầu chạy khi hệ thống có dữ liệu phân tích. Email
        được hỗ trợ trước, các kênh khác sau.
      </p>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <AlertRuleCard
            key={field.id}
            form={form}
            index={index}
            def={ALERT_RULE_KIND_DEFS[field.kind]}
            scopeOptions={scopeOptions}
            onRemove={() => remove(index)}
          />
        ))}
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có cảnh báo nào.</p>
        ) : null}
        {rulesError ? <p className="text-xs text-destructive">{rulesError}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Thêm cảnh báo</span>
        <div className="flex flex-wrap gap-2">
          {kinds.map((def) => (
            <Button
              key={def.kind}
              type="button"
              variant="outline"
              size="sm"
              disabled={fields.length >= MAX_ALERT_RULES}
              onClick={() => append(toAlertRuleInput(def.kind))}
            >
              <PlusIcon />
              {def.label}
            </Button>
          ))}
        </div>
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
    </div>
  );
}

function AlertRuleCard({
  form,
  index,
  def,
  scopeOptions,
  onRemove,
}: {
  form: ProjectForm;
  index: number;
  def: AlertRuleKindDef;
  scopeOptions: ScopeOption[];
  onRemove: () => void;
}) {
  const enabled = useWatch({ control: form.control, name: `alerts.rules.${index}.enabled` });
  const options = scopeOptions.filter((option) =>
    (def.scopes as string[]).includes(option.type),
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border px-3 py-3",
        !enabled && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Controller
          control={form.control}
          name={`alerts.rules.${index}.enabled`}
          render={({ field }) => (
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 accent-primary"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
              <span>
                <b className="block text-sm">{def.label}</b>
                <span className="text-xs text-muted-foreground">{def.description}</span>
              </span>
            </label>
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Xóa cảnh báo ${def.label}`}
          onClick={onRemove}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {options.length > 1 ? (
          <FormFieldSelect
            control={form.control}
            name={`alerts.rules.${index}.scope`}
            label="Phạm vi"
            options={options}
          />
        ) : null}
        <FormFieldText
          control={form.control}
          name={`alerts.rules.${index}.threshold`}
          type="number"
          label={`${def.thresholdLabel} (${def.unit})`}
        />
        {def.defaultWindow ? (
          <FormFieldSelect
            control={form.control}
            name={`alerts.rules.${index}.window`}
            label="Trong khoảng"
            options={ALERT_WINDOWS.map((value) => ({
              value,
              label: ALERT_WINDOW_LABELS[value],
            }))}
          />
        ) : null}
        {def.defaultMinMentions !== null ? (
          <FormFieldText
            control={form.control}
            name={`alerts.rules.${index}.minMentions`}
            type="number"
            label="Chỉ xét khi có ít nhất (mention)"
            description="Tránh cảnh báo khi lượng thảo luận quá ít"
          />
        ) : null}
        {def.usesKeywords ? (
          <div className="md:col-span-2">
            <FormFieldTags
              control={form.control}
              name={`alerts.rules.${index}.keywords`}
              label="Từ khóa"
              placeholder="VD: lừa đảo"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
