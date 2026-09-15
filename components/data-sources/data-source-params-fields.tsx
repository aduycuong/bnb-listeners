"use client";

import type { Control, FieldErrors } from "react-hook-form";

import { Field, FieldLabel } from "@/components/ui/field";
import type { SourceType } from "@/lib/data-sources/constants";
import type { DataSourceFormValues } from "@/lib/data-sources/types";

import { ScrapeFacebookParamsFields } from "./params/scrape-facebook-params-fields";
import { ScrapeWebsiteParamsFields } from "./params/scrape-website-params-fields";

type DataSourceParamsFieldsProps = {
  sourceType: SourceType;
  control: Control<DataSourceFormValues>;
  errors?: FieldErrors<DataSourceFormValues>["params"];
  disabled?: boolean;
};

export function DataSourceParamsFields({
  sourceType,
  control,
  errors,
  disabled = false,
}: DataSourceParamsFieldsProps) {
  if (sourceType === "scrape-facebook") {
    return (
      <ScrapeFacebookParamsFields
        control={control}
        errors={errors}
        disabled={disabled}
      />
    );
  }

  if (sourceType === "scrape-website") {
    return (
      <Field>
        <FieldLabel>Parameters</FieldLabel>
        <ScrapeWebsiteParamsFields />
      </Field>
    );
  }

  return null;
}
