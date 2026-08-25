"use client";

import { useQuery } from "@tanstack/react-query";

import { JobMenuFormPage } from "@/components/jobs/job-menu-form-page";
import { JobMenuListPage } from "@/components/jobs/job-menu-list-page";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import type { Job } from "@/db/schema";
import {
  getJobMenuConfig,
  type JobMenuKey,
} from "@/lib/jobs/job-menu-config";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type JobMenuRouteProps = {
  jobMenuKey: JobMenuKey;
  workspaceIndexParam: string;
};

export function JobMenuListRoutePage({
  jobMenuKey,
  workspaceIndexParam,
}: JobMenuRouteProps) {
  const menu = getJobMenuConfig(jobMenuKey);
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  return (
    <JobMenuListPage
      menu={menu}
      workspace={workspace}
      workspaceIndex={workspaceIndex}
    />
  );
}

export function JobMenuNewRoutePage({
  jobMenuKey,
  workspaceIndexParam,
}: JobMenuRouteProps) {
  const menu = getJobMenuConfig(jobMenuKey);
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  if (!workspace) {
    return null;
  }

  if (workspace.permission === "read") {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        You need edit access to create jobs.
      </div>
    );
  }

  return (
    <JobMenuFormPage
      menu={menu}
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode="create"
    />
  );
}

type JobMenuEditRoutePageProps = JobMenuRouteProps & {
  jobId: string;
};

async function fetchJob(workspaceId: string, jobId: string): Promise<Job> {
  const res = await workspaceFetch(workspaceId, `/api/jobs/${jobId}`);
  const data = (await res.json()) as Job & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load job.");
  }

  return data;
}

export function JobMenuEditRoutePage({
  jobMenuKey,
  workspaceIndexParam,
  jobId,
}: JobMenuEditRoutePageProps) {
  const menu = getJobMenuConfig(jobMenuKey);
  const { workspace, workspaceIndex } =
    useWorkspaceRouteContext(workspaceIndexParam);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["job", workspace?.id, jobId],
    queryFn: () => fetchJob(workspace!.id, jobId),
    enabled: !!workspace,
  });

  if (!workspace) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        Loading job…
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
        {error?.message ?? "Job not found."}
      </div>
    );
  }

  if (job.jobType !== menu.jobType) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-destructive">
        This job does not belong to {menu.label}.
      </div>
    );
  }

  return (
    <JobMenuFormPage
      menu={menu}
      workspace={workspace}
      workspaceIndex={workspaceIndex}
      mode="edit"
      job={job}
    />
  );
}
