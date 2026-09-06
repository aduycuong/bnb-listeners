"use client";

import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  useFormState,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getCronFriendlyText,
  getPresetCronSchedule,
  normalizeCronScheduleValue,
  PRESET_BUTTON_OPTIONS,
  type CronScheduleFormValue,
} from "@/lib/common/cron-presets";
import { getCommonTimezoneOptions } from "@/lib/common/timezone-options";

const TIMEZONE_OPTIONS = getCommonTimezoneOptions();

export type { CronScheduleFormValue } from "@/lib/common/cron-presets";

function getErrorsAtPath<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: FieldPath<T>,
): FieldErrors<CronScheduleFormValue> | undefined {
  const segments = String(name).split(".");
  let current: unknown = errors;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current as FieldErrors<CronScheduleFormValue> | undefined;
}

export type FormFieldCronProps<T extends FieldValues = FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  itemClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  messageClassName?: string;
  containerClassName?: string;
  presetsClassName?: string;
  inputClassName?: string;
  helperTextClassName?: string;
  inputGroupClassName?: string;
};

export function FormFieldCron<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "0 9 * * *",
  disabled = false,
  itemClassName,
  labelClassName,
  descriptionClassName,
  messageClassName,
  containerClassName,
  presetsClassName,
  inputClassName,
  helperTextClassName,
  inputGroupClassName,
}: FormFieldCronProps<T>) {
  const { errors } = useFormState({ control, name });
  const fieldErrors = getErrorsAtPath(errors, name);
  const cronError = fieldErrors?.cron;
  const timezoneError = fieldErrors?.timezone;
  const rootMessage =
    typeof fieldErrors === "object" &&
    fieldErrors !== null &&
    "message" in fieldErrors &&
    typeof fieldErrors.message === "string"
      ? fieldErrors.message
      : undefined;
  const rootError = fieldErrors?.root ?? (rootMessage ? { message: rootMessage } : undefined);
  const invalid = Boolean(cronError || timezoneError || rootError);

  return (
    <Field data-invalid={invalid || undefined} className={itemClassName}>
      <FieldLabel className={labelClassName}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value = normalizeCronScheduleValue(field.value);
          const timezoneItems = TIMEZONE_OPTIONS.some(
            (option) => option.value === value.timezone,
          )
            ? TIMEZONE_OPTIONS
            : [
                { value: value.timezone, label: value.timezone },
                ...TIMEZONE_OPTIONS,
              ];

          function update(patch: Partial<CronScheduleFormValue>) {
            field.onChange({ ...value, ...patch });
          }

          return (
            <div className={containerClassName ?? "space-y-3"}>
              <div className={presetsClassName ?? "flex flex-wrap gap-1.5"}>
                {PRESET_BUTTON_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      field.onChange(getPresetCronSchedule(option.value, value));
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <InputGroup
                data-disabled={disabled || undefined}
                className={cn("h-9", inputGroupClassName)}
              >
                <InputGroupAddon align="inline-start">
                  <InputGroupText className="text-xs">Cron</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  aria-invalid={invalid}
                  value={value.cron}
                  onChange={(event) => update({ cron: event.target.value })}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn("font-mono text-sm", inputClassName)}
                />
                <InputGroupAddon align="inline-end" className="pr-1.5">
                  <span className="sr-only" id={`${String(name)}-tz-label`}>
                    Timezone
                  </span>
                  <Select
                    items={timezoneItems}
                    value={value.timezone}
                    onValueChange={(timezone) =>
                      update({ timezone: timezone ?? value.timezone })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger
                      id={`${String(name)}-tz`}
                      size="sm"
                      aria-labelledby={`${String(name)}-tz-label`}
                      aria-invalid={invalid}
                      className={cn(
                        "h-8 max-w-[min(14rem,42vw)] shrink-0 gap-1 rounded-none border-0 bg-transparent px-2 text-xs shadow-none",
                        "focus-visible:ring-0 data-[size=sm]:h-8 dark:hover:bg-transparent",
                        "[&_svg]:size-3.5",
                      )}
                    >
                      <SelectValue placeholder="Timezone" />
                    </SelectTrigger>
                    <SelectContent
                      align="end"
                      side="bottom"
                      alignItemWithTrigger={false}
                      className="max-h-72 min-w-[min(20rem,90vw)]"
                    >
                      {timezoneItems.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-xs"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </InputGroupAddon>
              </InputGroup>

              {value.cron.trim() ? (
                <p
                  className={
                    helperTextClassName ?? "text-xs text-muted-foreground"
                  }
                >
                  {getCronFriendlyText(value.cron)}
                </p>
              ) : null}
            </div>
          );
        }}
      />
      {description ? (
        <FieldDescription className={descriptionClassName}>
          {description}
        </FieldDescription>
      ) : null}
      <FieldError
        className={messageClassName}
        errors={[cronError, timezoneError, rootError]}
      />
    </Field>
  );
}
