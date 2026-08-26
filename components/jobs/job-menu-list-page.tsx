"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { ResourceListPage } from "@/components/dashboard/resource-list-page";
import { jobsQueryKey } from "@/components/jobs/job-query-keys";
import { JobRunButton } from "@/components/jobs/job-run-button";
import { getCronFriendlyText } from "@/lib/common/cron-presets";
import {
  getJobMenuHref,
  type JobMenuConfig,
} from "@/lib/jobs/job-menu-config";
import type { ListJobsResult } from "@/lib/jobs/types";
import type { WorkspaceListItem } from "@/lib/workspaces/types";
import { workspaceFetch } from "@/lib/workspaces/utils/workspace-fetch";

type JobMenuListPageProps = {
  menu: JobMenuConfig;
  workspace: WorkspaceListItem;
  workspaceIndex: number;
};

async function fetchJobs(
  workspaceId: string,
  jobType: string,
): Promise<ListJobsResult> {
  const res = await workspaceFetch(
    workspaceId,
    `/api/jobs?jobType=${encodeURIComponent(jobType)}`,
  );
  const data = (await res.json()) as ListJobsResult & {
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? "Could not load jobs.");
  }

  return data;
}

export function JobMenuListPage({
  menu,
  workspace,
  workspaceIndex,
}: JobMenuListPageProps) {
  const canEdit = workspace.permission !== "read";

  const { data, isLoading, error } = useQuery({
    queryKey: jobsQueryKey(workspace.id, menu.jobType),
    queryFn: () => fetchJobs(workspace.id, menu.jobType),
  });

  const items = useMemo(() => {
    return (data?.items ?? []).map((job) => {
      const scheduleText = job.cronConfig.cron.trim()
        ? getCronFriendlyText(job.cronConfig.cron)
        : "No schedule";

      return {
        id: job.id,
        name: job.name,
        description: scheduleText,
        date: job.createdAt,
        badges: [
          job.enabled
            ? {
                label: "Enabled",
                className:
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              }
            : { label: "Disabled", className: "bg-muted text-muted-foreground" },
        ],
      };
    });
  }, [data?.items]);

  return (
    <ResourceListPage
      title={menu.listTitle}
      description={menu.listDescription}
      items={items}
      emptyTitle={menu.emptyTitle}
      emptyDescription={
        canEdit ? menu.emptyDescription : `${menu.listTitle} jobs will appear here once they are added.`
      }
      createHref={
        canEdit ? getJobMenuHref(workspaceIndex, menu, "new") : undefined
      }
      createLabel={menu.createLabel}
      isLoading={isLoading}
      errorMessage={error?.message}
      getItemHref={(item) => getJobMenuHref(workspaceIndex, menu, item.id)}
      renderItemActions={
        canEdit
          ? (item) => (
              <JobRunButton
                workspaceId={workspace.id}
                jobId={item.id}
                ariaLabel={`Run ${item.name}`}
              />
            )
          : undefined
      }
    />
  );
}
