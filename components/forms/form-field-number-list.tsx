"use client";

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
import { Input } from "@/components/ui/input";

type FormFieldNumberListProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
};

function parseNumberList(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
}

/**
 * Comma-separated numbers stored as `number[]`. The text is kept as typed;
 * an entry that is not a number becomes NaN, which the schema rejects.
 */
export function FormFieldNumberList<T extends FieldValues>(props: FormFieldNumberListProps<T>) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={({ field, fieldState }) => (
        <NumberListInput
          {...props}
          value={field.value as number[] | undefined}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          // A rule on the whole array (e.g. ascending) lands on `.root`.
          error={fieldState.error?.root ?? fieldState.error}
          invalid={fieldState.invalid}
        />
      )}
    />
  );
}

function NumberListInput({
  name,
  label,
  placeholder,
  description,
  disabled,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  invalid,
}: Omit<FormFieldNumberListProps<FieldValues>, "control"> & {
  value: number[] | undefined;
  onChange: (value: number[]) => void;
  onBlur: () => void;
  inputRef: (element: HTMLInputElement | null) => void;
  error: { message?: string } | undefined;
  invalid: boolean;
}) {
  const [text, setText] = useState(() => (value ?? []).join(", "));

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        ref={inputRef}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        aria-invalid={invalid}
        onBlur={onBlur}
        onChange={(event) => {
          setText(event.target.value);
          onChange(parseNumberList(event.target.value));
        }}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error]} />
    </Field>
  );
}
