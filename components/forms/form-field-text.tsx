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
import { Input } from "@/components/ui/input";

type FormFieldTextProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  /** `number` stores a number, or undefined while the input is empty. */
  type?: "text" | "number";
  disabled?: boolean;
  list?: string;
};

export function FormFieldText<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = "text",
  disabled,
  list,
}: FormFieldTextProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            id={field.name}
            name={field.name}
            ref={field.ref}
            type={type}
            list={list}
            value={field.value ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            onBlur={field.onBlur}
            onChange={(event) => {
              const raw = event.target.value;
              field.onChange(
                type === "number" ? (raw === "" ? undefined : Number(raw)) : raw,
              );
            }}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
