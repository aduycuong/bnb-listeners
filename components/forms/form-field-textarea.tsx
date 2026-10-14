"use client";

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
import { Textarea } from "@/components/ui/textarea";

type FormFieldTextareaProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  rows?: number;
  disabled?: boolean;
};

export function FormFieldTextarea<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  rows = 3,
  disabled,
}: FormFieldTextareaProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Textarea
            id={field.name}
            name={field.name}
            ref={field.ref}
            rows={rows}
            value={field.value ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.target.value)}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
