"use client";

import { Controller, type UseFormReturn } from "react-hook-form";

import { FormFieldSelect } from "@/components/forms/form-field-select";
import { FormFieldText } from "@/components/forms/form-field-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  PROJECT_STAGES,
  PROPERTY_SEGMENTS,
  REPORT_PERIOD_LABELS,
  REPORT_PERIODS,
} from "@/lib/projects/case-templates";
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

const toOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

/** Fields stored in `projects.case_config`, different for each case. */
export function ProjectCaseConfigFields({
  form,
  projectCase,
}: {
  form: ProjectForm;
  projectCase: AvailableProjectCase;
}) {
  if (projectCase === "project") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <FormFieldText
          control={form.control}
          name="caseConfig.province"
          label="Tỉnh, thành phố"
          placeholder="VD: TP.HCM"
        />
        <FormFieldText
          control={form.control}
          name="caseConfig.district"
          label="Quận, huyện, phường"
          placeholder="VD: Thuận An"
        />
        <FormFieldSelect
          control={form.control}
          name="caseConfig.segment"
          label="Phân khúc"
          options={toOptions(PROPERTY_SEGMENTS)}
        />
        <FormFieldSelect
          control={form.control}
          name="caseConfig.stage"
          label="Giai đoạn"
          options={toOptions(PROJECT_STAGES)}
        />
        <FormFieldText
          control={form.control}
          name="caseConfig.priceRef"
          type="number"
          label="Giá bán tham chiếu của CĐT (triệu/m²)"
          placeholder="VD: 46"
          description="Dùng để so với giá được nhắc tới trong thảo luận"
        />
      </div>
    );
  }

  if (projectCase === "market") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <Controller
          control={form.control}
          name="caseConfig.segments"
          render={({ field, fieldState }) => {
            const values: string[] = Array.isArray(field.value) ? field.value : [];
            return (
              <Field className="md:col-span-2" data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>Phân khúc</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_SEGMENTS.map((segment) => {
                    const checked = values.includes(segment);
                    return (
                      <label
                        key={segment}
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
                                ? values.filter((item) => item !== segment)
                                : [...values, segment],
                            )
                          }
                        />
                        {segment}
                      </label>
                    );
                  })}
                </div>
                <FieldError errors={[fieldState.error]} />
              </Field>
            );
          }}
        />
        <FormFieldText
          control={form.control}
          name="caseConfig.priceMin"
          type="number"
          label="Khoảng giá quan tâm từ (tỷ đồng)"
        />
        <FormFieldText
          control={form.control}
          name="caseConfig.priceMax"
          type="number"
          label="Đến (tỷ đồng)"
        />
        <FormFieldSelect
          control={form.control}
          name="caseConfig.period"
          label="Kỳ báo cáo"
          options={(["week", "month"] as const).map((value) => ({
            value,
            label: REPORT_PERIOD_LABELS[value],
          }))}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <FormFieldSelect
        control={form.control}
        name="caseConfig.period"
        label="Kỳ báo cáo chỉ số uy tín"
        options={REPORT_PERIODS.map((value) => ({
          value,
          label: REPORT_PERIOD_LABELS[value],
        }))}
      />
    </div>
  );
}
