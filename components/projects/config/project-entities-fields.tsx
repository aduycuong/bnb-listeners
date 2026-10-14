"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { FormFieldTags } from "@/components/forms/form-field-tags";
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

/** Entities grouped by the roles of the case; each entity carries its query terms. */
export function ProjectEntitiesFields({
  form,
  projectCase,
}: {
  form: ProjectForm;
  projectCase: AvailableProjectCase;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entities",
  });
  const roles = CASE_TEMPLATES[projectCase].roles;
  const rootError =
    form.formState.errors.entities?.message ??
    form.formState.errors.entities?.root?.message;

  return (
    <div className="flex flex-col gap-5">
      {roles.map((role) => {
        const rows = fields
          .map((field, index) => ({ field, index }))
          .filter(({ field }) => field.role === role.role);

        return (
          <section key={role.role} className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                {role.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {role.min === role.max ? `${role.min} mục` : `${role.min}–${role.max} mục`}
                </span>
              </h3>
              <p className="text-[13px] text-muted-foreground">{role.hint}</p>
            </div>

            {rows.map(({ field, index }) => (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-2xl border border-border px-3 py-3"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <FormFieldText
                    control={form.control}
                    name={`entities.${index}.name`}
                    label="Tên"
                    placeholder={role.placeholder}
                  />
                  <FormFieldTags
                    control={form.control}
                    name={`entities.${index}.aliases`}
                    label="Tên gọi khác"
                    placeholder={role.aliasPlaceholder}
                  />
                </div>
                <details className="group text-sm">
                  <summary className="cursor-pointer text-[13px] text-muted-foreground">
                    Điều kiện khớp nâng cao
                  </summary>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <FormFieldTags
                      control={form.control}
                      name={`entities.${index}.withTerms`}
                      label="Phải đi kèm một trong các từ"
                      placeholder="VD: dự án, căn hộ"
                      description="Dùng khi tên dễ trùng nghĩa khác. Để trống nếu không cần."
                    />
                    <FormFieldTags
                      control={form.control}
                      name={`entities.${index}.exclude`}
                      label="Loại trừ khi có"
                      placeholder="VD: nước hoa"
                    />
                  </div>
                </details>
                {rows.length > role.min ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2Icon />
                      Xóa
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}

            {rows.length < role.max ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      id: crypto.randomUUID(),
                      role: role.role,
                      name: "",
                      aliases: [],
                      withTerms: [],
                      exclude: [],
                    })
                  }
                >
                  <PlusIcon />
                  Thêm {role.label.toLowerCase()}
                </Button>
              </div>
            ) : null}
          </section>
        );
      })}
      {rootError ? <p className="text-xs text-destructive">{rootError}</p> : null}
    </div>
  );
}
