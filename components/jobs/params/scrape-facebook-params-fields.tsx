"use client";

import { Controller, type Control, type FieldErrors } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { JobFormValues } from "@/lib/jobs/types";

type ScrapeFacebookParamsFieldsProps = {
  control: Control<JobFormValues>;
  errors?: FieldErrors<JobFormValues>["params"];
  disabled?: boolean;
};

function getFacebookUrlError(
  errors: FieldErrors<JobFormValues>["params"],
): { message?: string } | undefined {
  if (!errors || typeof errors !== "object") {
    return undefined;
  }

  const facebookUrlError = (errors as { facebookUrl?: { message?: string } })
    .facebookUrl;
  return facebookUrlError;
}

function getFacebookUrlValue(params: Record<string, unknown>): string {
  const value = params.facebookUrl;
  return typeof value === "string" ? value : "";
}

export function ScrapeFacebookParamsFields({
  control,
  errors,
  disabled = false,
}: ScrapeFacebookParamsFieldsProps) {
  const urlError = getFacebookUrlError(errors);

  return (
    <Field data-invalid={!!urlError || undefined}>
      <FieldLabel htmlFor="job-facebook-url">Facebook URL</FieldLabel>
      <FieldDescription>
        Page or group URL. The scrape detects which dataset to use from the
        path.
      </FieldDescription>
      <Controller
        name="params"
        control={control}
        render={({ field }) => (
          <Input
            id="job-facebook-url"
            type="url"
            autoComplete="off"
            placeholder="https://www.facebook.com/your-page"
            value={getFacebookUrlValue(field.value)}
            disabled={disabled}
            aria-invalid={!!urlError}
            onBlur={field.onBlur}
            onChange={(event) =>
              field.onChange({
                ...field.value,
                facebookUrl: event.target.value,
              })
            }
          />
        )}
      />
      <FieldError errors={[urlError]} />
    </Field>
  );
}
