"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { dataSourcesQueryKey, sourceRunsQueryKey } from "@/components/data-sources/data-source-query-keys";
import { FormFieldCron } from "@/components/forms/form-field-cron";
import { DataSourceParamsFields } from "@/components/data-sources/data-source-params-fields";
import { SourceRunsSection } from "@/components/data-sources/source-runs-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { DataSource } from "@/db/schema";
import { EMPTY_CRON_SCHEDULE } from "@/lib/common/cron-presets";
import {
  getDataSourceMenuHref,
  type DataSourceMenuConfig,
} from "@/lib/data-sources/data-source-menu-config";
import { getDefaultSourceParams } from "@/lib/data-sources/handlers/registry";
import { dataSourceFormSchema } from "@/lib/data-sources/schema";
import type { DataSourceFormValues } from "@/lib/data-sources/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type DataSourceMenuFormPageProps = {
  menu: DataSourceMenuConfig;
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  mode: "create" | "edit";
  dataSource?: DataSource;
};

function dataSourceToFormValues(
  menu: DataSourceMenuConfig,
  dataSource: DataSource,
): DataSourceFormValues {
  return {
    name: dataSource.name,
    sourceType: menu.sourceType,
    cronConfig: dataSource.cronConfig ?? EMPTY_CRON_SCHEDULE,
    enabled: dataSource.enabled,
    params: (dataSource.params ?? {}) as Record<string, unknown>,
  };
}

export function DataSourceMenuFormPage({
  menu,
  workspace,
  workspaceIndex,
  mode,
  dataSource,
}: DataSourceMenuFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = workspace.permission !== "read";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listHref = getDataSourceMenuHref(workspaceIndex, menu);

  const form = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceFormSchema),
    defaultValues: dataSource
      ? dataSourceToFormValues(menu, dataSource)
      : {
          name: "",
          sourceType: menu.sourceType,
          cronConfig: { ...EMPTY_CRON_SCHEDULE, cron: "0 9 * * *" },
          enabled: true,
          params: getDefaultSourceParams(menu.sourceType),
        },
  });

  useEffect(() => {
    if (dataSource) {
      form.reset(dataSourceToFormValues(menu, dataSource));
    }
  }, [dataSource?.id, form, menu, dataSource]);

  async function onSubmit(values: DataSourceFormValues) {
    const body = {
      name: values.name,
      sourceType: menu.sourceType,
      cronConfig: values.cronConfig,
      enabled: values.enabled,
      params: values.params,
    };

    const url =
      mode === "create"
        ? "/api/data-sources"
        : `/api/data-sources/${dataSource?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await workspaceFetch(workspace.id, url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as DataSource & {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save dataSource.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: mode === "create" ? "Job created." : "Job updated.",
      type: "success",
    });

    await queryClient.invalidateQueries({
      queryKey: dataSourcesQueryKey(workspace.id, menu.sourceType),
    });

    if (mode === "edit" && dataSource) {
      await queryClient.invalidateQueries({
        queryKey: sourceRunsQueryKey(workspace.id, dataSource.id),
      });
    }

    if (mode === "create") {
      router.push(getDataSourceMenuHref(workspaceIndex, menu, data.id));
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!dataSource) {
      return;
    }

    setDeleting(true);

    try {
      const res = await workspaceFetch(
        workspace.id,
        `/api/data-sources/${dataSource.id}`,
        {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not delete dataSource.",
          type: "error",
        });
        return;
      }

      toast.add({
        title: data.message ?? "Job deleted.",
        type: "success",
      });
      setDeleteOpen(false);
      await queryClient.invalidateQueries({
        queryKey: dataSourcesQueryKey(workspace.id, menu.sourceType),
      });
      router.push(listHref);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const nameError = form.formState.errors.name;
  const paramsErrors = form.formState.errors.params;
  const title =
    mode === "create"
      ? menu.formCreateTitle
      : (dataSource?.name ?? menu.listTitle);
  const description =
    mode === "create" ? menu.formCreateDescription : menu.formEditDescription;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
      <div className="mb-6 space-y-4">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-ml-2 w-fit"
          render={<Link href={listHref} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to {menu.label}
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Job details</CardTitle>
            <CardDescription>
              The schedule syncs to QStash when the dataSource is enabled and has a
              cron pattern.
            </CardDescription>
          </CardHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="mb-6">
              <FieldGroup>
                <Field data-invalid={!!nameError || undefined}>
                  <FieldLabel htmlFor="job-name">Name</FieldLabel>
                  <Input
                    id="job-name"
                    autoComplete="off"
                    placeholder={`${menu.label} scrape`}
                    aria-invalid={!!nameError}
                    disabled={!canEdit || isSubmitting}
                    {...form.register("name")}
                  />
                  <FieldError errors={[nameError]} />
                </Field>

                <Field>
                  <FieldLabel>Job type</FieldLabel>
                  <FieldDescription>{menu.listDescription}</FieldDescription>
                </Field>

                <FormFieldCron
                  control={form.control}
                  name="cronConfig"
                  label="Schedule"
                  description="Leave the cron pattern empty to save the dataSource without a QStash schedule."
                  disabled={!canEdit || isSubmitting}
                />

                <DataSourceParamsFields
                  sourceType={menu.sourceType}
                  control={form.control}
                  errors={paramsErrors}
                  disabled={!canEdit || isSubmitting}
                />

                <Field orientation="horizontal">
                  <div className="flex flex-1 flex-col gap-1">
                    <FieldLabel htmlFor="job-enabled">Enabled</FieldLabel>
                    <FieldDescription>
                      Disabled jobs do not keep an active QStash schedule.
                    </FieldDescription>
                  </div>
                  <Controller
                    name="enabled"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        id="job-enabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canEdit || isSubmitting}
                      />
                    )}
                  />
                </Field>
              </FieldGroup>
            </CardContent>

            {canEdit ? (
              <CardFooter className="flex flex-wrap items-center gap-3 border-t">
                {mode === "edit" ? (
                  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogTrigger
                      render={
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={isSubmitting || deleting}
                        />
                      }
                    >
                      Delete dataSource
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the dataSource, its QStash schedule, run
                          history, all documents it created (and their chunks),
                          and related term digest rows. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          disabled={deleting}
                          onClick={handleDelete}
                        >
                          {deleting ? (
                            <>
                              <Loader2Icon
                                className="animate-spin"
                                data-icon="inline-start"
                              />
                              Deleting…
                            </>
                          ) : (
                            "Delete job"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting || deleting}
                  className="ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                      Saving…
                    </>
                  ) : mode === "create" ? (
                    menu.createLabel
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </CardFooter>
            ) : null}
          </form>
        </Card>

        {mode === "edit" && dataSource ? (
          <SourceRunsSection
            workspaceId={workspace.id}
            dataSourceId={dataSource.id}
            canRun={canEdit}
          />
        ) : null}
      </div>
    </div>
  );
}
