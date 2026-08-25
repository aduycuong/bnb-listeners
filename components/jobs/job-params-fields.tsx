"use client";

import type { Control, FieldErrors } from "react-hook-form";

import { Field, FieldLabel } from "@/components/ui/field";
import type { SchedulableJobType } from "@/lib/jobs/constants";
import type { JobFormValues } from "@/lib/jobs/types";

import { ScrapeFacebookParamsFields } from "./params/scrape-facebook-params-fields";
import { ScrapeWebsiteParamsFields } from "./params/scrape-website-params-fields";

type JobParamsFieldsProps = {
  jobType: SchedulableJobType;
  control: Control<JobFormValues>;
  errors?: FieldErrors<JobFormValues>["params"];
  disabled?: boolean;
};

export function JobParamsFields({
  jobType,
  control,
  errors,
  disabled = false,
}: JobParamsFieldsProps) {
  if (jobType === "scrape-facebook") {
    return (
      <ScrapeFacebookParamsFields
        control={control}
        errors={errors}
        disabled={disabled}
      />
    );
  }

  if (jobType === "scrape-website") {
    return (
      <Field>
        <FieldLabel>Parameters</FieldLabel>
        <ScrapeWebsiteParamsFields />
      </Field>
    );
  }

  return null;
}
