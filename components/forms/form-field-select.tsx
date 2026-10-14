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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FormFieldSelectOption = { value: string; label: string };

type FormFieldSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: FormFieldSelectOption[];
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  /** Hide the label, e.g. inside a table-like row. */
  hideLabel?: boolean;
};

export function FormFieldSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  description,
  disabled,
  hideLabel,
}: FormFieldSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid || undefined}>
          <FieldLabel htmlFor={field.name} className={hideLabel ? "sr-only" : undefined}>
            {label}
          </FieldLabel>
          <Select
            items={options}
            value={field.value ? field.value : null}
            onValueChange={(next) => field.onChange(next ?? "")}
            disabled={disabled}
          >
            <SelectTrigger
              id={field.name}
              className="w-full"
              aria-invalid={fieldState.invalid}
              onBlur={field.onBlur}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
