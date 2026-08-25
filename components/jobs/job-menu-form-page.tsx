"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { jobsQueryKey, jobRunsQueryKey } from "@/components/jobs/job-query-keys";
import { FormFieldCron } from "@/components/jobs/form-field-cron";
import { JobParamsFields } from "@/components/jobs/job-params-fields";
import { JobRunsSection } from "@/components/jobs/job-runs-section";
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
import type { Job } from "@/db/schema";
import { EMPTY_CRON_SCHEDULE } from "@/lib/common/cron-presets";
import {
  getJobMenuHref,
  type JobMenuConfig,
} from "@/lib/jobs/job-menu-config";
import { getDefaultJobParams } from "@/lib/jobs/handlers/registry";
import { jobFormSchema } from "@/lib/jobs/schema";
import type { JobFormValues } from "@/lib/jobs/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type JobMenuFormPageProps = {
  menu: JobMenuConfig;
  workspace: WorkspaceListItem;
  workspaceIndex: number;
  mode: "create" | "edit";
  job?: Job;
};

function jobToFormValues(menu: JobMenuConfig, job: Job): JobFormValues {
  return {
    name: job.name,
    jobType: menu.jobType,
    cronConfig: job.cronConfig ?? EMPTY_CRON_SCHEDULE,
    enabled: job.enabled,
    params: (job.params ?? {}) as Record<string, unknown>,
  };
}

export function JobMenuFormPage({
  menu,
  workspace,
  workspaceIndex,
  mode,
  job,
}: JobMenuFormPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canEdit = workspace.permission !== "read";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const listHref = getJobMenuHref(workspaceIndex, menu);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: job
      ? jobToFormValues(menu, job)
      : {
          name: "",
          jobType: menu.jobType,
          cronConfig: { ...EMPTY_CRON_SCHEDULE, cron: "0 9 * * *" },
          enabled: true,
          params: getDefaultJobParams(menu.jobType),
        },
  });

  useEffect(() => {
    if (job) {
      form.reset(jobToFormValues(menu, job));
    }
  }, [job, form, menu]);

  async function onSubmit(values: JobFormValues) {
    const body = {
      name: values.name,
      jobType: menu.jobType,
      cronConfig: values.cronConfig,
      enabled: values.enabled,
      params: values.params,
    };

    const url = mode === "create" ? "/api/jobs" : `/api/jobs/${job?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await workspaceFetch(workspace.id, url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Job & {
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      toast.add({
        title: data.message ?? data.error ?? "Could not save job.",
        type: "error",
      });
      return;
    }

    toast.add({
      title: mode === "create" ? "Job created." : "Job updated.",
      type: "success",
    });

    await queryClient.invalidateQueries({
      queryKey: jobsQueryKey(workspace.id, menu.jobType),
    });

    if (mode === "edit" && job) {
      await queryClient.invalidateQueries({
        queryKey: jobRunsQueryKey(workspace.id, job.id),
      });
    }

    if (mode === "create") {
      router.push(getJobMenuHref(workspaceIndex, menu, data.id));
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!job) {
      return;
    }

    setDeleting(true);

    try {
      const res = await workspaceFetch(workspace.id, `/api/jobs/${job.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        toast.add({
          title: data.message ?? data.error ?? "Could not delete job.",
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
        queryKey: jobsQueryKey(workspace.id, menu.jobType),
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
  const cronConfigErrors = form.formState.errors.cronConfig;

  const title =
    mode === "create" ? menu.formCreateTitle : (job?.name ?? menu.listTitle);
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
              The schedule syncs to QStash when the job is enabled and has a
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
                  errors={cronConfigErrors}
                  disabled={!canEdit || isSubmitting}
                />

                <JobParamsFields
                  jobType={menu.jobType}
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
                      Delete job
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the job, its QStash schedule, and run
                          history. This action cannot be undone.
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

        {mode === "edit" && job ? (
          <JobRunsSection
            workspaceId={workspace.id}
            jobId={job.id}
            canRun={canEdit}
          />
        ) : null}
      </div>
    </div>
  );
}
