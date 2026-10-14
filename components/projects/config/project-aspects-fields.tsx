"use client";

import { PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { FormFieldText } from "@/components/forms/form-field-text";
import { Button } from "@/components/ui/button";
import { CASE_TEMPLATES } from "@/lib/projects/case-templates";
import type { AvailableProjectCase } from "@/lib/projects/project-cases";
import type {
  CreateProjectWithConfigBody,
  CreateProjectWithConfigInput,
} from "@/lib/projects/schema";

type ProjectForm = UseFormReturn<
  CreateProjectWithConfigInput,
  unknown,
  CreateProjectWithConfigBody
>;

export function ProjectAspectsFields({
  form,
  projectCase,
}: {
  form: ProjectForm;
  projectCase: AvailableProjectCase;
}) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "aspects",
  });
  const rootError =
    form.formState.errors.aspects?.message ??
    form.formState.errors.aspects?.root?.message;

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid items-start gap-3 rounded-2xl border border-border px-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
        >
          <FormFieldText
            control={form.control}
            name={`aspects.${index}.name`}
            label="Khía cạnh"
            placeholder="VD: Phí gửi xe"
          />
          <FormFieldText
            control={form.control}
            name={`aspects.${index}.description`}
            label="Gợi ý cho AI"
            placeholder="Những gì được tính vào khía cạnh này"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:mt-6"
            aria-label="Xóa khía cạnh"
            disabled={fields.length <= 1}
            onClick={() => remove(index)}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      {rootError ? <p className="text-xs text-destructive">{rootError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= 20}
          onClick={() => append({ name: "", description: "" })}
        >
          <PlusIcon />
          Thêm khía cạnh
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            replace(
              CASE_TEMPLATES[projectCase].aspects.map((aspect) => {
                const kept = form
                  .getValues("aspects")
                  .find((item) => item.name === aspect.name);
                return {
                  id: kept?.id,
                  key: kept?.key,
                  name: aspect.name,
                  description: aspect.description,
                };
              }),
            )
          }
        >
          <RotateCcwIcon />
          Dùng bộ mẫu
        </Button>
      </div>
    </div>
  );
}
