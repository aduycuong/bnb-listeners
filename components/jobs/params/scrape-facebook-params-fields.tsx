"use client";

import { Controller, useWatch, type Control, type FieldErrors } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_MAX_COMMENTS,
  DEFAULT_SCRAPE_POST_COMMENTS,
} from "@/lib/jobs/handlers/scrape-facebook/config";
import type { JobFormValues } from "@/lib/jobs/types";

type ScrapeFacebookParamsFieldsProps = {
  control: Control<JobFormValues>;
  errors?: FieldErrors<JobFormValues>["params"];
  disabled?: boolean;
};

type FacebookParamsErrors = {
  facebookUrl?: { message?: string };
  maxComments?: { message?: string };
};

function getFacebookParamsErrors(
  errors: FieldErrors<JobFormValues>["params"],
): FacebookParamsErrors {
  if (!errors || typeof errors !== "object") {
    return {};
  }

  return errors as FacebookParamsErrors;
}

function getFacebookUrlValue(params: Record<string, unknown>): string {
  const value = params.facebookUrl;
  return typeof value === "string" ? value : "";
}

function getScrapePostCommentsValue(params: Record<string, unknown>): boolean {
  if (params.scrapePostComments === false) {
    return false;
  }

  return DEFAULT_SCRAPE_POST_COMMENTS;
}

function getMaxCommentsValue(params: Record<string, unknown>): number {
  const value = params.maxComments;

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return DEFAULT_MAX_COMMENTS;
}

export function ScrapeFacebookParamsFields({
  control,
  errors,
  disabled = false,
}: ScrapeFacebookParamsFieldsProps) {
  const params = useWatch({ control, name: "params" }) ?? {};
  const scrapePostComments = getScrapePostCommentsValue(params);
  const paramErrors = getFacebookParamsErrors(errors);

  return (
    <FieldGroup>
      <Field data-invalid={!!paramErrors.facebookUrl || undefined}>
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
              aria-invalid={!!paramErrors.facebookUrl}
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
        <FieldError errors={[paramErrors.facebookUrl]} />
      </Field>

      <Field orientation="horizontal">
        <div className="flex flex-1 flex-col gap-1">
          <FieldLabel htmlFor="job-scrape-post-comments">
            Scrape post comments
          </FieldLabel>
          <FieldDescription>
            After a new post is saved, automatically fetch comments on a
            recurring schedule.
          </FieldDescription>
        </div>
        <Controller
          name="params"
          control={control}
          render={({ field }) => (
            <Switch
              id="job-scrape-post-comments"
              checked={getScrapePostCommentsValue(field.value)}
              onCheckedChange={(checked) =>
                field.onChange({
                  ...field.value,
                  scrapePostComments: checked,
                })
              }
              disabled={disabled}
            />
          )}
        />
      </Field>

      {scrapePostComments ? (
        <Field data-invalid={!!paramErrors.maxComments || undefined}>
          <FieldLabel htmlFor="job-max-comments">Max comments</FieldLabel>
          <FieldDescription>
            Maximum number of comments to fetch per scrape run.
          </FieldDescription>
          <Controller
            name="params"
            control={control}
            render={({ field }) => (
              <Input
                id="job-max-comments"
                type="number"
                min={1}
                step={1}
                autoComplete="off"
                value={getMaxCommentsValue(field.value)}
                disabled={disabled}
                aria-invalid={!!paramErrors.maxComments}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  field.onChange({
                    ...field.value,
                    maxComments: Number.isNaN(parsed) ? "" : parsed,
                  });
                }}
              />
            )}
          />
          <FieldError errors={[paramErrors.maxComments]} />
        </Field>
      ) : null}
    </FieldGroup>
  );
}
