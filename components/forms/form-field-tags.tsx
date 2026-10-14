"use client";

import { XIcon } from "lucide-react";
import { useState } from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

type FormFieldTagsProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
};

/** A string list edited as chips; Enter, comma or blur adds the typed value. */
export function FormFieldTags<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
}: FormFieldTagsProps<T>) {
  const [text, setText] = useState("");

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const values: string[] = Array.isArray(field.value) ? field.value : [];

        function add(raw: string) {
          const next = raw.trim();
          setText("");
          if (!next) return;
          if (values.some((item) => item.toLowerCase() === next.toLowerCase())) return;
          field.onChange([...values, next]);
        }

        return (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <div
              className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[14px] border-[1.5px] border-input px-2 py-1.5 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15 aria-invalid:border-destructive dark:bg-input/30"
              aria-invalid={fieldState.invalid || undefined}
            >
              {values.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {value}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Xóa ${value}`}
                    disabled={disabled}
                    onClick={() => field.onChange(values.filter((item) => item !== value))}
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id={field.name}
                ref={field.ref}
                value={text}
                disabled={disabled}
                placeholder={values.length ? "Thêm…" : placeholder}
                className="min-w-24 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
                onChange={(event) => {
                  const next = event.target.value;
                  if (next.endsWith(",")) {
                    add(next.slice(0, -1));
                    return;
                  }
                  setText(next);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    add(text);
                  } else if (event.key === "Backspace" && !text && values.length) {
                    field.onChange(values.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  add(text);
                  field.onBlur();
                }}
              />
            </div>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldError
              errors={
                // Array fields report one error per item (e.g. an invalid email).
                Array.isArray(fieldState.error)
                  ? fieldState.error.filter(Boolean)
                  : [fieldState.error]
              }
            />
          </Field>
        );
      }}
    />
  );
}
