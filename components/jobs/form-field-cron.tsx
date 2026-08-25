"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  EMPTY_CRON_SCHEDULE,
  getCronFriendlyText,
  getPresetCronSchedule,
  PRESET_BUTTON_OPTIONS,
  type CronScheduleFormValue,
} from "@/lib/common/cron-presets";
import type { JobFormValues } from "@/lib/jobs/types";

type FormFieldCronProps = {
  control: Control<JobFormValues>;
  errors?: FieldErrors<JobFormValues>["cronConfig"];
  disabled?: boolean;
};

export function FormFieldCron({
  control,
  errors,
  disabled = false,
}: FormFieldCronProps) {
  const cronError = errors?.cron;
  const timezoneError = errors?.timezone;
  const rootError = errors?.root ?? errors?.message
    ? { message: errors.message as string }
    : undefined;

  return (
    <Field data-invalid={!!errors || undefined}>
      <FieldLabel>Schedule</FieldLabel>
      <FieldDescription>
        Leave the cron pattern empty to save the job without a QStash schedule.
      </FieldDescription>

      <Controller
        name="cronConfig"
        control={control}
        defaultValue={EMPTY_CRON_SCHEDULE}
        render={({ field }) => {
          const value = field.value ?? EMPTY_CRON_SCHEDULE;
          const friendlyText = getCronFriendlyText(value.cron);

          function updateCronConfig(next: CronScheduleFormValue) {
            field.onChange(next);
          }

          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PRESET_BUTTON_OPTIONS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      updateCronConfig(getPresetCronSchedule(preset.value, value))
                    }
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field data-invalid={!!cronError || undefined}>
                  <FieldLabel htmlFor="job-cron-pattern">Cron pattern</FieldLabel>
                  <Input
                    id="job-cron-pattern"
                    value={value.cron}
                    onChange={(event) =>
                      updateCronConfig({ ...value, cron: event.target.value })
                    }
                    placeholder="0 9 * * *"
                    aria-invalid={!!cronError}
                    disabled={disabled}
                    autoComplete="off"
                  />
                  <FieldError errors={[cronError]} />
                </Field>

                <Field data-invalid={!!timezoneError || undefined}>
                  <FieldLabel htmlFor="job-cron-timezone">Timezone</FieldLabel>
                  <Input
                    id="job-cron-timezone"
                    value={value.timezone}
                    onChange={(event) =>
                      updateCronConfig({ ...value, timezone: event.target.value })
                    }
                    placeholder="UTC"
                    aria-invalid={!!timezoneError}
                    disabled={disabled}
                    autoComplete="off"
                  />
                  <FieldError errors={[timezoneError]} />
                </Field>
              </div>

              {friendlyText ? (
                <p className="text-sm text-muted-foreground">{friendlyText}</p>
              ) : null}
            </div>
          );
        }}
      />

      <FieldError errors={[rootError]} />
    </Field>
  );
}
